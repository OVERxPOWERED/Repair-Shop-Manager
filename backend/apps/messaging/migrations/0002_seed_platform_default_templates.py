from django.db import migrations


def seed_default_templates(apps, schema_editor):
    MessageTemplate = apps.get_model("messaging", "MessageTemplate")

    # Platform default templates (shop=None)
    # Note: SMS bodies must match DLT-approved templates exactly.
    # Each SMS template is tagged with # TODO(verify) matches DLT template <id>
    templates = [
        # --- JOB_RECEIVED ---
        # TODO(verify) matches DLT template 1107161000000001
        {
            "key": "job_received",
            "channel": "sms",
            "locale": "en",
            "body": "Your device {device} is received at {shop_name} for repair. Job #{job_no}. Track status: {link}",
            "dlt_template_id": "1107161000000001",
        },
        # TODO(verify) matches DLT template 1107161000000002
        {
            "key": "job_received",
            "channel": "sms",
            "locale": "hi",
            "body": "आपका डिवाइस {device} मरम्मत के लिए {shop_name} पर प्राप्त हुआ। जॉब #{job_no}। स्थिति देखें: {link}",
            "dlt_template_id": "1107161000000002",
        },
        # TODO(verify) matches DLT template 1107161000000003
        {
            "key": "job_received",
            "channel": "sms",
            "locale": "hi-Latn",
            "body": "Aapka device {device} repair ke liye {shop_name} par receive hua. Job #{job_no}. Status track karein: {link}",
            "dlt_template_id": "1107161000000003",
        },
        {
            "key": "job_received",
            "channel": "whatsapp",
            "locale": "en",
            "body": "Hi {customer_name}, your {device} has been received for repair at {shop_name}. Job #{job_no}. Track progress here: {link}",
            "wa_template_name": "job_received_en",
        },
        {
            "key": "job_received",
            "channel": "whatsapp",
            "locale": "hi",
            "body": "नमस्ते {customer_name}, आपका {device} मरम्मत के लिए {shop_name} पर प्राप्त हो गया है। जॉब #{job_no}। प्रगति यहाँ देखें: {link}",
            "wa_template_name": "job_received_hi",
        },
        {
            "key": "job_received",
            "channel": "whatsapp",
            "locale": "hi-Latn",
            "body": "Namaste {customer_name}, aapka {device} repair ke liye {shop_name} par receive ho gaya hai. Job #{job_no}. Yahan status track karein: {link}",
            "wa_template_name": "job_received_hilatn",
        },
        # --- STATUS_UPDATE ---
        # TODO(verify) matches DLT template 1107161000000004
        {
            "key": "status_update",
            "channel": "sms",
            "locale": "en",
            "body": "Update on job #{job_no} ({device}) at {shop_name}: status is now {status}. Track: {link}",
            "dlt_template_id": "1107161000000004",
        },
        # TODO(verify) matches DLT template 1107161000000005
        {
            "key": "status_update",
            "channel": "sms",
            "locale": "hi",
            "body": "जॉब #{job_no} ({device}) की स्थिति {shop_name} पर: अब {status} है। ट्रैक करें: {link}",
            "dlt_template_id": "1107161000000005",
        },
        # TODO(verify) matches DLT template 1107161000000006
        {
            "key": "status_update",
            "channel": "sms",
            "locale": "hi-Latn",
            "body": "Job #{job_no} ({device}) ka status update {shop_name} par: ab {status} hai. Track karein: {link}",
            "dlt_template_id": "1107161000000006",
        },
        {
            "key": "status_update",
            "channel": "whatsapp",
            "locale": "en",
            "body": "Hi {customer_name}, status update for your {device} (Job #{job_no}) at {shop_name}: {status}. Track live: {link}",
            "wa_template_name": "status_update_en",
        },
        {
            "key": "status_update",
            "channel": "whatsapp",
            "locale": "hi",
            "body": "नमस्ते {customer_name}, {shop_name} पर आपके {device} (जॉब #{job_no}) की स्थिति: {status}। लाइव ट्रैक करें: {link}",
            "wa_template_name": "status_update_hi",
        },
        {
            "key": "status_update",
            "channel": "whatsapp",
            "locale": "hi-Latn",
            "body": "Namaste {customer_name}, {shop_name} par aapke {device} (Job #{job_no}) ka status ab: {status}. Live track karein: {link}",
            "wa_template_name": "status_update_hilatn",
        },
        # --- READY_FOR_PICKUP ---
        # TODO(verify) matches DLT template 1107161000000007
        {
            "key": "ready_for_pickup",
            "channel": "sms",
            "locale": "en",
            "body": "Your {device} is ready for pickup at {shop_name}. Job #{job_no}. Total amount: Rs {amount}. Details: {link}",
            "dlt_template_id": "1107161000000007",
        },
        # TODO(verify) matches DLT template 1107161000000008
        {
            "key": "ready_for_pickup",
            "channel": "sms",
            "locale": "hi",
            "body": "आपका {device} {shop_name} पर पिकअप के लिए तैयार है। जॉब #{job_no}। कुल राशि: रु {amount}। विवरण: {link}",
            "dlt_template_id": "1107161000000008",
        },
        # TODO(verify) matches DLT template 1107161000000009
        {
            "key": "ready_for_pickup",
            "channel": "sms",
            "locale": "hi-Latn",
            "body": "Aapka {device} {shop_name} par pickup ke liye ready hai. Job #{job_no}. Total amount: Rs {amount}. Details: {link}",
            "dlt_template_id": "1107161000000009",
        },
        {
            "key": "ready_for_pickup",
            "channel": "whatsapp",
            "locale": "en",
            "body": "Great news {customer_name}! Your {device} (Job #{job_no}) is repaired and ready for pickup at {shop_name}. Total due: Rs {amount}. View details: {link}",
            "wa_template_name": "ready_for_pickup_en",
        },
        {
            "key": "ready_for_pickup",
            "channel": "whatsapp",
            "locale": "hi",
            "body": "अच्छी खबर {customer_name}! आपका {device} (जॉब #{job_no}) मरम्मत हो चुका है और {shop_name} पर पिकअप के लिए तैयार है। कुल देय: रु {amount}। विवरण देखें: {link}",
            "wa_template_name": "ready_for_pickup_hi",
        },
        {
            "key": "ready_for_pickup",
            "channel": "whatsapp",
            "locale": "hi-Latn",
            "body": "Acchi khabar {customer_name}! Aapka {device} (Job #{job_no}) repair ho gaya hai aur {shop_name} par pickup ke liye ready hai. Total: Rs {amount}. Details dekhein: {link}",
            "wa_template_name": "ready_for_pickup_hilatn",
        },
        # --- DELIVERED ---
        # TODO(verify) matches DLT template 1107161000000010
        {
            "key": "delivered",
            "channel": "sms",
            "locale": "en",
            "body": "Your {device} (Job #{job_no}) has been delivered by {shop_name}. Thank you for your business!",
            "dlt_template_id": "1107161000000010",
        },
        # TODO(verify) matches DLT template 1107161000000011
        {
            "key": "delivered",
            "channel": "sms",
            "locale": "hi",
            "body": "आपका {device} (जॉब #{job_no}) {shop_name} द्वारा डिलीवर कर दिया गया है। धन्यवाद!",
            "dlt_template_id": "1107161000000011",
        },
        # TODO(verify) matches DLT template 1107161000000012
        {
            "key": "delivered",
            "channel": "sms",
            "locale": "hi-Latn",
            "body": "Aapka {device} (Job #{job_no}) {shop_name} dwara deliver kar diya gaya hai. Dhanyawaad!",
            "dlt_template_id": "1107161000000012",
        },
        {
            "key": "delivered",
            "channel": "whatsapp",
            "locale": "en",
            "body": "Hi {customer_name}, your {device} (Job #{job_no}) was delivered. Thank you for choosing {shop_name}!",
            "wa_template_name": "delivered_en",
        },
        {
            "key": "delivered",
            "channel": "whatsapp",
            "locale": "hi",
            "body": "नमस्ते {customer_name}, आपका {device} (जॉब #{job_no}) डिलीवर हो गया है। {shop_name} चुनने के लिए धन्यवाद!",
            "wa_template_name": "delivered_hi",
        },
        {
            "key": "delivered",
            "channel": "whatsapp",
            "locale": "hi-Latn",
            "body": "Namaste {customer_name}, aapka {device} (Job #{job_no}) deliver ho gaya hai. {shop_name} ko chunne ke liye dhanyawaad!",
            "wa_template_name": "delivered_hilatn",
        },
        # --- INVOICE ---
        # TODO(verify) matches DLT template 1107161000000013
        {
            "key": "invoice",
            "channel": "sms",
            "locale": "en",
            "body": "Invoice for Job #{job_no} at {shop_name}. Amount: Rs {amount}. View invoice: {link}",
            "dlt_template_id": "1107161000000013",
        },
        # TODO(verify) matches DLT template 1107161000000014
        {
            "key": "invoice",
            "channel": "sms",
            "locale": "hi",
            "body": "{shop_name} पर जॉब #{job_no} का इनवॉइस। राशि: रु {amount}। इनवॉइस देखें: {link}",
            "dlt_template_id": "1107161000000014",
        },
        # TODO(verify) matches DLT template 1107161000000015
        {
            "key": "invoice",
            "channel": "sms",
            "locale": "hi-Latn",
            "body": "{shop_name} par Job #{job_no} ka invoice. Amount: Rs {amount}. Invoice dekhein: {link}",
            "dlt_template_id": "1107161000000015",
        },
        {
            "key": "invoice",
            "channel": "whatsapp",
            "locale": "en",
            "body": "Hi {customer_name}, your invoice for Job #{job_no} at {shop_name} is ready. Total amount: Rs {amount}. View invoice: {link}",
            "wa_template_name": "invoice_en",
        },
        {
            "key": "invoice",
            "channel": "whatsapp",
            "locale": "hi",
            "body": "नमस्ते {customer_name}, {shop_name} पर जॉब #{job_no} का आपका इनवॉइस तैयार है। कुल राशि: रु {amount}। इनवॉइस देखें: {link}",
            "wa_template_name": "invoice_hi",
        },
        {
            "key": "invoice",
            "channel": "whatsapp",
            "locale": "hi-Latn",
            "body": "Namaste {customer_name}, {shop_name} par Job #{job_no} ka aapka invoice ready hai. Total amount: Rs {amount}. Invoice dekhein: {link}",
            "wa_template_name": "invoice_hilatn",
        },
        # --- OTP ---
        # TODO(verify) matches DLT template 1107161000000016
        {
            "key": "otp",
            "channel": "sms",
            "locale": "en",
            "body": "Your FixPro verification code is {otp}. Valid for 10 minutes. Do not share this code with anyone.",
            "dlt_template_id": "1107161000000016",
        },
        # TODO(verify) matches DLT template 1107161000000017
        {
            "key": "otp",
            "channel": "sms",
            "locale": "hi",
            "body": "आपका FixPro सत्यापन कोड {otp} है। 10 मिनट के लिए मान्य। यह कोड किसी के साथ साझा न करें।",
            "dlt_template_id": "1107161000000017",
        },
        # TODO(verify) matches DLT template 1107161000000018
        {
            "key": "otp",
            "channel": "sms",
            "locale": "hi-Latn",
            "body": "Aapka FixPro verification code {otp} hai. 10 minute ke liye valid hai. Kisi ke saath share na karein.",
            "dlt_template_id": "1107161000000018",
        },
        {
            "key": "otp",
            "channel": "whatsapp",
            "locale": "en",
            "body": "Your FixPro verification code is {otp}. Valid for 10 minutes.",
            "wa_template_name": "otp_en",
        },
        {
            "key": "otp",
            "channel": "whatsapp",
            "locale": "hi",
            "body": "आपका FixPro सत्यापन कोड {otp} है। 10 मिनट के लिए मान्य।",
            "wa_template_name": "otp_hi",
        },
        {
            "key": "otp",
            "channel": "whatsapp",
            "locale": "hi-Latn",
            "body": "Aapka FixPro verification code {otp} hai. 10 minute ke liye valid.",
            "wa_template_name": "otp_hilatn",
        },
    ]

    for item in templates:
        MessageTemplate.objects.get_or_create(
            shop=None,
            key=item["key"],
            channel=item["channel"],
            locale=item["locale"],
            defaults={
                "body": item["body"],
                "dlt_template_id": item.get("dlt_template_id"),
                "wa_template_name": item.get("wa_template_name"),
                "is_active": True,
            },
        )


def reverse_default_templates(apps, schema_editor):
    MessageTemplate = apps.get_model("messaging", "MessageTemplate")
    MessageTemplate.objects.filter(shop__isnull=True).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("messaging", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(seed_default_templates, reverse_default_templates),
    ]
