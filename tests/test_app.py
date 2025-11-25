
import copy
import pytest
from urllib.parse import quote

from fastapi.testclient import TestClient

from src import app as app_module


client = TestClient(app_module.app)


def signup_path(activity: str) -> str:
    return f"/activities/{quote(activity)}/signup"


def participants_path(activity: str) -> str:
    return f"/activities/{quote(activity)}/participants"


@pytest.fixture(autouse=True)
def restore_activities():
    # preserve original activities between tests
    orig = copy.deepcopy(app_module.activities)
    yield
    app_module.activities.clear()
    app_module.activities.update(copy.deepcopy(orig))


def test_get_activities():
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, dict)
    assert "Chess Club" in data


def test_signup_and_duplicate():
    email = "teststudent@mergington.edu"
    activity = "Chess Club"

    # sign up first time
    resp = client.post(signup_path(activity), params={"email": email})
    assert resp.status_code == 200
    assert email in app_module.activities[activity]["participants"]

    # signing up again should fail with 400
    resp2 = client.post(signup_path(activity), params={"email": email})
    assert resp2.status_code == 400


def test_unregister_participant():
    activity = "Chess Club"
    email = "deleteme@mergington.edu"

    # add then remove
    client.post(signup_path(activity), params={"email": email})
    assert email in app_module.activities[activity]["participants"]
    resp = client.delete(participants_path(activity), params={"email": email})
    assert resp.status_code == 200
    assert email not in app_module.activities[activity]["participants"]


def test_unregister_nonexistent():
    activity = "Chess Club"
    email = "notfound@mergington.edu"
    resp = client.delete(participants_path(activity), params={"email": email})
    assert resp.status_code == 404


def test_signup_nonexistent_activity():
    resp = client.post("/activities/NoSuchActivity/signup", params={"email": "x@x.com"})
    assert resp.status_code == 404
