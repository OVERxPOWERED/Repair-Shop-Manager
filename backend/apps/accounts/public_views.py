"""
Public server-rendered views for account deletion, privacy policy, and terms of service.
Required for Google Play and Apple App Store compliance.
"""

from django.shortcuts import render

from apps.accounts.models import OTPChallenge, User
from apps.accounts.services import (
    _check_code,
    request_account_deletion,
    send_otp,
)
from apps.core.api.errors import DomainError
from apps.core.net import get_client_ip
from apps.core.phone import normalize_phone


def account_deletion_page(request):
    """
    Public web page allowing users to request account deletion as mandated by Apple/Google.
    Uses OTP authentication before queueing deletion request.
    """
    context = {"step": "initial", "error": None, "phone": ""}

    if request.method == "POST":
        step = request.POST.get("step")

        if step == "send_otp":
            raw_phone = request.POST.get("phone", "").strip()
            try:
                phone = normalize_phone(raw_phone)
            except ValueError as err:
                context["error"] = str(err)
                return render(request, "accounts/account_deletion.html", context, status=400)

            # Check if active user exists
            user = User.objects.filter(phone=phone, deleted_at__isnull=True, is_active=True).first()
            if not user:
                context["error"] = "No active FixPro account found with this phone number."
                return render(request, "accounts/account_deletion.html", context, status=404)

            try:
                send_otp(
                    phone=phone,
                    purpose=OTPChallenge.PurposeChoices.DELETE_ACCOUNT,
                    ip=get_client_ip(request),
                )
            except DomainError as err:
                context["error"] = str(err.detail)
                return render(request, "accounts/account_deletion.html", context, status=err.status_code)

            context["step"] = "verify"
            context["phone"] = phone
            return render(request, "accounts/account_deletion.html", context)

        elif step == "confirm":
            raw_phone = request.POST.get("phone", "").strip()
            code = request.POST.get("code", "").strip()
            reason = request.POST.get("reason", "").strip()

            try:
                phone = normalize_phone(raw_phone)
            except ValueError as err:
                context["error"] = str(err)
                return render(request, "accounts/account_deletion.html", context, status=400)

            try:
                _check_code(phone=phone, code=code, purpose=OTPChallenge.PurposeChoices.DELETE_ACCOUNT)
            except DomainError as err:
                context["step"] = "verify"
                context["phone"] = phone
                context["error"] = str(err.detail)
                return render(request, "accounts/account_deletion.html", context, status=err.status_code)

            user = User.objects.filter(phone=phone, deleted_at__isnull=True, is_active=True).first()
            if not user:
                context["error"] = "User account not found."
                return render(request, "accounts/account_deletion.html", context, status=404)

            try:
                req = request_account_deletion(user=user, reason=reason)
            except DomainError as err:
                context["step"] = "verify"
                context["phone"] = phone
                context["error"] = str(err.detail)
                return render(request, "accounts/account_deletion.html", context, status=err.status_code)

            context["step"] = "completed"
            context["scheduled_for"] = req.scheduled_for
            return render(request, "accounts/account_deletion.html", context)

    return render(request, "accounts/account_deletion.html", context)


def privacy_policy_page(request):
    """Public privacy policy complying with Indian DPDP Act 2023 and App Store rules."""
    return render(request, "accounts/privacy.html", {"updated_at": "2026-10-04"})


def terms_of_service_page(request):
    """Public terms of service governing FixPro multi-tenant platform usage."""
    return render(request, "accounts/terms.html", {"updated_at": "2026-10-04"})
