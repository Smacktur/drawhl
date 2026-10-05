from app.domain.errors import ValidationFailed

MAX_NAME_LENGTH = 50


def greet(name: str) -> str:
    """Return a greeting; fails on blank or overly long names."""
    clean = name.strip()
    if not clean:
        raise ValidationFailed("name must not be blank")
    if len(clean) > MAX_NAME_LENGTH:
        raise ValidationFailed(f"name must be at most {MAX_NAME_LENGTH} characters")
    return f"Hello, {clean}!"
