"""
Authentication tests.
Tests:
  1. Successful registration - verifies 201, expected message, no password leak
  2. Successful login - verifies 200, access_token present and non-empty
  3. Failed login (wrong password) - verifies 401 rejection
  4. Duplicate email registration - verifies 400 rejection
"""

import pytest

 
# Test 1: Successful registration
 
def test_register_success(client):
    payload = {
        "name": "Alice",
        "email": "alice@example.com",
        "password": "strongpassword1",
    }
    response = client.post("/auth/register", json=payload)

    # Endpoint returns 201 Created
    assert response.status_code == 201

    body = response.json()

    # Response contains a message confirming registration
    assert "message" in body
    assert "registered" in body["message"].lower()

    # Password must NOT appear anywhere in the response
    assert "password" not in body
    assert "hashed_password" not in body
    assert payload["password"] not in str(body)


 
# Test 2: Successful login returns a valid access token
 
def test_login_success(client):
    # First register the user
    client.post(
        "/auth/register",
        json={"name": "Bob", "email": "bob@example.com", "password": "strongpassword1"},
    )

    # Login uses OAuth2 form data (username = email)
    response = client.post(
        "/auth/login",
        data={"username": "bob@example.com", "password": "strongpassword1"},
    )

    assert response.status_code == 200

    body = response.json()

    # Token fields must be present
    assert "access_token" in body
    assert "token_type" in body

    # Token must be a non-empty string
    assert isinstance(body["access_token"], str)
    assert len(body["access_token"]) > 0

    # Token type must be bearer
    assert body["token_type"].lower() == "bearer"


 
# Test 3: Login with wrong password is rejected with 401
 
def test_login_wrong_password(client):
    client.post(
        "/auth/register",
        json={"name": "Carol", "email": "carol@example.com", "password": "correctpassword"},
    )

    response = client.post(
        "/auth/login",
        data={"username": "carol@example.com", "password": "wrongpassword"},
    )

    # Must be rejected - not a success
    assert response.status_code == 401
    # Error detail must not reveal internal information
    assert "access_token" not in response.json()


 
# Test 4: Duplicate email registration is rejected with 400
 
def test_register_duplicate_email(client):
    payload = {
        "name": "Dave",
        "email": "dave@example.com",
        "password": "mypassword123",
    }

    # First registration succeeds
    first = client.post("/auth/register", json=payload)
    assert first.status_code == 201

    # Second registration with the same email must fail
    second = client.post("/auth/register", json=payload)
    assert second.status_code == 400
