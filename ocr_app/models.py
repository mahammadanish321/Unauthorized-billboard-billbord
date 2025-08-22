from django.db import models

# Create your models here.
from django.db import models

class Billboard(models.Model):
    text = models.CharField(max_length=255, unique=True)  # Authorised billboard text
    location = models.CharField(max_length=255, blank=True, null=True)  # Optional
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.text


class ScanRecord(models.Model):
    image = models.ImageField(upload_to='billboard_scans/')
    extracted_text = models.TextField()
    is_authorised = models.BooleanField(default=False)
    scanned_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{'Authorised' if self.is_authorised else 'Unauthorised'} - {self.extracted_text[:30]}"
