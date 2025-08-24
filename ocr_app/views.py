import pytesseract
from PIL import Image
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from .serializers import OCRSerializer
from .models import Billboard, ScanRecord
import google.generativeai as genai
from django.conf import settings
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
import re
import io
from difflib import SequenceMatcher

# --- Authorisation helpers ---

def normalize_text(s: str) -> str:
    if not s:
        return ""
    parts = re.findall(r"[a-z0-9]+", s.lower())
    return " ".join(parts)

# Popular brands commonly seen on billboards (baseline authorised list)
POPULAR_BRANDS = [
    "Coca-Cola", "Pepsi", "Sprite", "Fanta", "Red Bull",
    "McDonald's", "KFC", "Burger King", "Subway", "Domino's", "Pizza Hut", "Starbucks",
    "Apple", "Samsung", "Google", "Microsoft", "Amazon", "Meta", "Facebook", "Instagram", "WhatsApp", "YouTube", "Netflix", "Uber", "Lyft",
    "Nike", "Adidas", "Puma", "Reebok", "Levi's", "H&M", "Zara", "L'Oreal",
    "Toyota", "Honda", "Ford", "BMW", "Mercedes-Benz", "Audi", "Volkswagen", "Hyundai", "Kia", "Tata", "Mahindra",
    "Airtel", "Vodafone", "Jio", "Reliance",
    "Nestle", "Unilever", "Procter & Gamble", "Colgate", "Dove", "Lux", "Sunsilk",
    "LG", "Sony", "Panasonic", "Canon", "Nikon", "HP", "Dell", "Lenovo", "Acer", "Asus", "Philips",
    "Shell", "BP", "Exxon", "Total", "7-Eleven"
]


def best_brand_match(norm_ext: str):
    """
    Return (is_match, best_brand, score) for the popular brands list using
    substring check and fuzzy similarity. Score in [0,1].
    """
    if not norm_ext:
        return False, None, 0.0

    best_brand = None
    best_score = 0.0

    for brand in POPULAR_BRANDS:
        norm_brand = normalize_text(brand)
        if not norm_brand:
            continue
        # strong containment signal
        if norm_brand in norm_ext or norm_ext in norm_brand:
            return True, brand, 1.0
        score = SequenceMatcher(None, norm_ext, norm_brand).ratio()
        if score > best_score:
            best_score = score
            best_brand = brand

    # Authorise if similarity exceeds 20%
    return (best_score >= 0.20), best_brand, best_score


def authorisation_match(extracted_text: str):
    norm_ext = normalize_text(extracted_text)
    if not norm_ext:
        return False, None, 0.0

    # First, check against popular brands with a 20% threshold
    is_brand, brand, brand_score = best_brand_match(norm_ext)
    if is_brand:
        return True, brand, brand_score

    best_match = None
    best_score = 0.0

    # Threshold for DB configured authorised entries (stricter to avoid false positives)
    THRESHOLD = 0.75

    for bb in Billboard.objects.all().only("text"):
        norm_auth = normalize_text(bb.text)
        if not norm_auth:
            continue

        # Strong signal if one contains the other
        if norm_auth in norm_ext or norm_ext in norm_auth:
            return True, bb.text, 1.0

        # Token overlap (Jaccard) as secondary strong signal
        set_ext = set(norm_ext.split())
        set_auth = set(norm_auth.split())
        if set_ext and set_auth:
            jaccard = len(set_ext & set_auth) / len(set_ext | set_auth)
            if jaccard >= 0.5:
                return True, bb.text, jaccard

        score = SequenceMatcher(None, norm_ext, norm_auth).ratio()
        if score > best_score:
            best_score = score
            best_match = bb.text

    is_auth = best_score >= THRESHOLD
    return is_auth, best_match, best_score


@method_decorator(csrf_exempt, name='dispatch')
class OCRAPIView(APIView):
    def post(self, request):
        serializer = OCRSerializer(data=request.data)
        if serializer.is_valid():
            image = serializer.validated_data['image']
            img = Image.open(image)

            # Extract text from image
            try:
                extracted_text = pytesseract.image_to_string(img).strip()
            except Exception as e:
                # Fallback to Gemini OCR if Tesseract is unavailable
                api_key = getattr(settings, 'GOOGLE_API_KEY', None)
                if not api_key:
                    return Response({
                        "error": "OCR engine not available",
                        "detail": f"Tesseract error: {str(e)}; GOOGLE_API_KEY not configured for fallback"
                    }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
                try:
                    genai.configure(api_key=api_key)
                    model = genai.GenerativeModel('gemini-1.5-flash')
                    prompt = (
                        "Extract the exact readable text from this billboard image. "
                        "Return only the text without any extra words. If no text is readable, return an empty string."
                    )
                    buf = io.BytesIO()
                    img.convert('RGB').save(buf, format='PNG')
                    image_part = {"mime_type": "image/png", "data": buf.getvalue()}
                    response = model.generate_content([prompt, image_part])
                    extracted_text = (getattr(response, 'text', '') or "").strip()
                except Exception as ge:
                    return Response({
                        "error": "AI OCR failed",
                        "detail": str(ge)
                    }, status=status.HTTP_502_BAD_GATEWAY)

            # Check if authorised with fuzzy/partial matching
            is_authorised, matched_text, confidence = authorisation_match(extracted_text)

            # Save only if UNAUTHORISED
            if not is_authorised:
                ScanRecord.objects.create(
                    image=image,
                    extracted_text=extracted_text,
                    is_authorised=False
                )

            # Build reason string
            if not extracted_text.strip():
                reason = "No readable text detected in the image."
            elif is_authorised:
                reason = f"Matched authorized entry: '{matched_text}' (similarity {round(confidence*100,1)}%)."
            else:
                best = matched_text or 'None'
                reason = f"Does not meet authorization criteria. Best match: '{best}' (similarity {round(confidence*100,1)}%)."

            # Response to user
            return Response({
                "extracted_text": extracted_text,
                "is_authorised": is_authorised,
                "matched_text": matched_text,
                "confidence": round(confidence * 100, 1),
                "reason": reason,
                "message": "Billboard is authorised." if is_authorised else "Billboard is UNAUTHORISED!",
                "source": "tesseract"
            }, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@method_decorator(csrf_exempt, name='dispatch')
class AIOCRAPIView(APIView):
    def post(self, request):
        serializer = OCRSerializer(data=request.data)
        if serializer.is_valid():
            image = serializer.validated_data['image']
            img = Image.open(image)

            api_key = getattr(settings, 'GOOGLE_API_KEY', None)
            if not api_key:
                return Response({"error": "GOOGLE_API_KEY not configured"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            try:
                genai.configure(api_key=api_key)
                model = genai.GenerativeModel('gemini-1.5-flash')

                prompt = (
                    "Extract the exact readable text from this billboard image. "
                    "Return only the text without any extra words. If no text is readable, return an empty string."
                )

                # Send image bytes explicitly for robustness
                buf = io.BytesIO()
                img.convert('RGB').save(buf, format='PNG')
                image_part = {"mime_type": "image/png", "data": buf.getvalue()}
                response = model.generate_content([prompt, image_part])
                extracted_text = (getattr(response, 'text', '') or "").strip()
            except Exception as e:
                return Response(
                    {"error": "AI OCR failed", "detail": str(e)},
                    status=status.HTTP_502_BAD_GATEWAY
                )

            # Check if authorised with fuzzy/partial matching
            is_authorised, matched_text, confidence = authorisation_match(extracted_text)

            # Save only if UNAUTHORISED
            if not is_authorised:
                ScanRecord.objects.create(
                    image=image,
                    extracted_text=extracted_text,
                    is_authorised=False
                )

            # Build reason string
            if not extracted_text.strip():
                reason = "No readable text detected in the image."
            elif is_authorised:
                reason = f"Matched authorized entry: '{matched_text}' (similarity {round(confidence*100,1)}%)."
            else:
                best = matched_text or 'None'
                reason = f"Does not meet authorization criteria. Best match: '{best}' (similarity {round(confidence*100,1)}%)."

            return Response({
                "extracted_text": extracted_text,
                "is_authorised": is_authorised,
                "matched_text": matched_text,
                "confidence": round(confidence * 100, 1),
                "reason": reason,
                "message": "Billboard is authorised." if is_authorised else "Billboard is UNAUTHORISED!",
                "source": "gemini"
            }, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@method_decorator(csrf_exempt, name='dispatch')
class BrandsAPIView(APIView):
    """Manage authorised brands stored in DB (Billboard model)."""
    def get(self, request):
        # Return both default popular brands and DB brands
        db_brands = list(Billboard.objects.all().values('id', 'text', 'location', 'created_at'))
        return Response({
            "popular_brands": POPULAR_BRANDS,
            "db_brands": db_brands
        }, status=status.HTTP_200_OK)

    def post(self, request):
        name = request.data.get('name') or request.data.get('text')
        location = request.data.get('location')
        if not name or not str(name).strip():
            return Response({"error": "Missing 'name'"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            obj, created = Billboard.objects.get_or_create(text=str(name).strip(), defaults={"location": location})
            return Response({
                "id": obj.id,
                "text": obj.text,
                "location": obj.location,
                "created": created
            }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


@method_decorator(csrf_exempt, name='dispatch')
class BrandDetailAPIView(APIView):
    def delete(self, request, pk):
        try:
            obj = Billboard.objects.get(pk=pk)
            obj.delete()
            return Response({"deleted": pk}, status=status.HTTP_200_OK)
        except Billboard.DoesNotExist:
            return Response({"error": "Brand not found"}, status=status.HTTP_404_NOT_FOUND)
