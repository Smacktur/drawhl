import pytest

from app.domain.errors import ValidationFailed
from app.domain.greeting import greet


def test_greets_by_trimmed_name():
    assert greet("  Ada ") == "Hello, Ada!"


@pytest.mark.parametrize("name", ["", "   ", "x" * 51])
def test_rejects_blank_or_long_names(name):
    with pytest.raises(ValidationFailed):
        greet(name)
