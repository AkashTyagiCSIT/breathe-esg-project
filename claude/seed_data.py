import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'breathe_esg.settings')
django.setup()

from django.contrib.auth.models import User
from tenants.models import Tenant, TenantMembership

tenant, _ = Tenant.objects.get_or_create(name='Acme Corp', slug='acme-corp')

analyst, created = User.objects.get_or_create(username='analyst')
if created:
    analyst.set_password('analyst123')
    analyst.email = 'analyst@acme.com'
    analyst.save()

TenantMembership.objects.get_or_create(user=analyst, tenant=tenant, defaults={'role': 'analyst'})

admin_user, created = User.objects.get_or_create(username='admin')
if created:
    admin_user.set_password('admin123')
    admin_user.email = 'admin@acme.com'
    admin_user.is_staff = True
    admin_user.save()

TenantMembership.objects.get_or_create(user=admin_user, tenant=tenant, defaults={'role': 'admin'})

print("Seed data created.")
print("Tenant: Acme Corp")
print("Users: analyst / analyst123 | admin / admin123")
