from rest_framework import serializers

class OCRSerializer(serializers.Serializer):
    image = serializers.ImageField()
    