class DomainError(Exception):
    """Base for expected business errors; the API layer maps them to HTTP responses."""

    code = "domain_error"

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


class ValidationFailed(DomainError):
    code = "validation_failed"


class NotFound(DomainError):
    code = "not_found"


class DependencyUnavailable(DomainError):
    code = "dependency_unavailable"
