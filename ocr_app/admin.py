from django.contrib import admin

# Register your models here.
from django.contrib import admin
from .models import Billboard, ScanRecord

admin.site.register(Billboard)
admin.site.register(ScanRecord)
