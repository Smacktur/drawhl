<!--
template: privacy-policy (base) · template-version: 2026-10 · regional sections: regions/*.md
Name processors by category, never by vendor. Fill {{placeholders}}, keep "if X" blocks only when X is true, delete this comment.
-->

# Privacy Policy

*Effective date: {{effective_date}}*

This policy explains what personal data {{service_name}} ("the service", "we") collects, why, who we share it with, and the choices and rights you have. We collect only what the service needs to work. We do not sell your personal information.

## Who we are

The service is operated by {{operator_name}}, {{operator_country}} (the "controller" under the GDPR). Contact for any privacy question or request: [{{privacy_email}}](mailto:{{privacy_email}}).

## What we collect and why

| Data | When | Why | Legal basis | Kept for |
|---|---|---|---|---|
{{data_inventory_rows}}

<!-- if accounts -->
### Your account

When you sign up we ask for {{account_fields}} so you can sign in and we can reach you about the service. We keep account data while your account is active and delete it within {{account_deletion_days}} days after you delete the account.
<!-- end -->

<!-- if user_content -->
### Content you add

We store {{user_content_description}} so the service can do what you asked. It is yours; we do not look at it except to fix a problem you reported or when the law requires it.
<!-- end -->

<!-- if llm -->
### AI processing

To {{llm_purpose}}, the text you enter is sent to AI service providers, which process it on our behalf and returns the result. {{llm_training_statement}} The results are generated automatically and can be wrong; they do not produce decisions with legal or similarly significant effects on you.
<!-- end -->

### Analytics

We measure how the site is used with a privacy-friendly analytics tool that does not use cookies and anonymizes the data it collects. We see aggregated numbers (pages viewed, referring sites, country, device type), not individual people.

### Cookies and browser storage

We use only cookies and browser storage that are strictly necessary for the service: {{necessary_storage}}, and, where these features exist, to keep you signed in, protect your account and process payments. We do not use advertising or cross-site tracking cookies. Strictly necessary cookies do not need your consent; you can delete them in your browser settings, but parts of the service may stop working.

### Technical data

Our hosting provider processes your IP address and request details to deliver the pages and keep the service secure. {{server_log_retention}}

### Messages you send us

If you email us, we keep the correspondence so we can answer and refer back to it.

## Who we share data with

We do not sell or share personal information for advertising. We use service providers ("processors") that may process data only on our instructions and for the purposes above:

{{processor_categories}}

We may disclose data when required by law or a valid legal request, or to protect the rights and safety of our users and the service. If the service is transferred to another operator, we will tell you before your data becomes subject to a different policy.

## Where data is processed

{{transfer_statement}}

## Your rights

Wherever you live, you can ask us to:

- tell you what personal data we hold about you and give you a copy;
- correct it;
- delete it;
- stop or limit using it;
- withdraw consent you gave, at any time, without affecting earlier processing.

Send the request to [{{privacy_email}}](mailto:{{privacy_email}}). We answer within 30 days, or sooner where the law of your country sets a shorter deadline. We may need to confirm it is really you.

{{regional_sections}}

## Children

The service is not directed at children under 13, and it is meant for people aged {{minimum_age}} or older. If you believe a child has given us personal data, contact us and we will delete it.

## Security

Data travels over encrypted connections (HTTPS). Access to production systems is limited to the people who run the service. No method is perfectly secure; if a breach affects you, we will notify you and the authorities as the law requires.

## Changes

We will update this page when our practices change and adjust the effective date at the top. For significant changes we will give notice on the site<!-- if accounts --> or by email<!-- end --> before they take effect.

## Contact

{{operator_name}} · [{{privacy_email}}](mailto:{{privacy_email}})
