====================================================================
सामाजिक सुरक्षा पोर्टल — Setup Instructions
====================================================================
Supabase Project: https://kbyfvqkfcxqgjjtfvvxf.supabase.co

Files:
  index.html    → सार्वजनिक खोज पृष्ठ (credentials already set ✅)
  admin.html    → Admin panel         (credentials already set ✅)
  schema.sql    → Database schema
  README.txt    → यो फाइल


--------------------------------------------------------------------
१) Database Schema चलाउनुहोस्
--------------------------------------------------------------------
Supabase → SQL Editor → schema.sql को पूरा content paste → Run


--------------------------------------------------------------------
२) Admin User बनाउनुहोस्
--------------------------------------------------------------------
1. Supabase → Authentication → Users → Add User → Create new user
   Email: admin@example.com
   Password: (बलियो password)

2. त्यसपछि SQL Editor मा:

   insert into public.user_roles(email, role, status)
   values ('admin@example.com', 'admin', 'active')
   on conflict(email) do update
   set role='admin', status='active';


--------------------------------------------------------------------
३) Run गर्नुहोस्
--------------------------------------------------------------------
- index.html खोल्नुहोस् → सार्वजनिक खोज
- admin.html खोल्नुहोस् → Admin login + CSV upload


--------------------------------------------------------------------
४) CSV Format
--------------------------------------------------------------------
Header (कम्तीमा):
  beneficiary_name, social_security_id

Optional:
  sn, ward_no, target_group, renewal_application_no,
  renewal_application_date, system_renewal_date,
  system_renewal_reg_no, renewal_method

Note:
- UTF-8 encoded
- Date format: YYYY-MM-DD
- Nepali digits (०-९) auto-convert हुन्छन्

====================================================================