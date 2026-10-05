import pytest

from app.adapters.secrets.fernet import FernetSecretBox, NullSecretBox
from app.domain.errors import SecretKeyMissing, SecretUnreadable


def test_round_trip_and_ciphertext_hides_value():
    box = FernetSecretBox("any operator string")
    encrypted = box.encrypt("pat-123")
    assert "pat-123" not in encrypted
    assert box.decrypt(encrypted) == "pat-123"


def test_other_key_cannot_read():
    encrypted = FernetSecretBox("key one").encrypt("pat-123")
    with pytest.raises(SecretUnreadable):
        FernetSecretBox("key two").decrypt(encrypted)


def test_null_box():
    with pytest.raises(SecretKeyMissing):
        NullSecretBox().encrypt("pat-123")
    with pytest.raises(SecretUnreadable):
        NullSecretBox().decrypt("anything")
