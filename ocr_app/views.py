import pytesseract
from PIL import Image
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from .serializers import OCRSerializer
from .models import Billboard, ScanRecord

class OCRAPIView(APIView):
    def post(self, request):
        serializer = OCRSerializer(data=request.data)
        if serializer.is_valid():
            image = serializer.validated_data['image']
            img = Image.open(image)

            # Extract text from image
            extracted_text = pytesseract.image_to_string(img).strip()

            # Check if authorised
            is_authorised = Billboard.objects.filter(text__iexact=extracted_text).exists()

            # Save only if UNAUTHORISED
            if not is_authorised:
                ScanRecord.objects.create(
                    image=image,
                    extracted_text=extracted_text,
                    is_authorised=False
                )

            # Response to user
            return Response({
                "extracted_text": extracted_text,
                "is_authorised": is_authorised,
                "message": "Billboard is authorised." if is_authorised else "Billboard is UNAUTHORISED!"
            }, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
