"""
Application CRUD and authorization tests.

Tests:
  4. Create application - verifies 201 and data in response
  5. Get user's applications - verifies list contains the created application
  6. Update application - verifies update persists (re-fetched from DB)
  7. Delete application - verifies 204, then 404 on re-fetch
  8. Authorization / ownership - User B cannot access, modify, or delete User A's data
"""

import pytest
from tests.conftest import SAMPLE_APPLICATION, create_user_and_login


 
# Test 4: Create application
 
def test_create_application(client, auth_headers):
    response = client.post("/applications", json=SAMPLE_APPLICATION, headers=auth_headers)

    assert response.status_code == 201 # Created successfully

    body = response.json()

    # The router returns {message, company, salary}
    assert body["company"] == SAMPLE_APPLICATION["company"]
    assert body["salary"] == SAMPLE_APPLICATION["salary"]
    assert "message" in body


 
# Test 5: Get user's applications
 
def test_get_applications_contains_created(client, auth_headers):
    # Create one application
    client.post("/applications", json=SAMPLE_APPLICATION, headers=auth_headers)

    response = client.get("/applications", headers=auth_headers)
    assert response.status_code == 200

    body = response.json()

    # Response is paginated - items key holds the list
    assert "items" in body
    items = body["items"]

    assert len(items) >= 1

    # At least one item matches what we created
    companies = [item["company"] for item in items]
    assert SAMPLE_APPLICATION["company"] in companies

    # Verify the returned item has all expected fields
    matched = next(i for i in items if i["company"] == SAMPLE_APPLICATION["company"])
    assert matched["role"] == SAMPLE_APPLICATION["role"]
    assert matched["salary"] == SAMPLE_APPLICATION["salary"]
    assert matched["status"] == SAMPLE_APPLICATION["status"]
    assert "id" in matched


 
# Test 6: Update application - change persists when re-fetched
 
def test_update_application_persists(client, auth_headers):
    # Create
    create_resp = client.post("/applications", json=SAMPLE_APPLICATION, headers=auth_headers)
    assert create_resp.status_code == 201

    # Get the ID from the list (create returns message/company/salary, not id)
    list_resp = client.get("/applications", headers=auth_headers)
    app_id = list_resp.json()["items"][0]["id"]

    updated_payload = {
        "company": SAMPLE_APPLICATION["company"],
        "role": SAMPLE_APPLICATION["role"],
        "salary": SAMPLE_APPLICATION["salary"],
        "status": "Interview",  # changed from Applied
    }

    put_resp = client.put(f"/applications/{app_id}", json=updated_payload, headers=auth_headers)
    assert put_resp.status_code == 200

    # Re-fetch to confirm the change actually persisted in the database
    get_resp = client.get(f"/applications/{app_id}", headers=auth_headers)
    assert get_resp.status_code == 200
    assert get_resp.json()["status"] == "Interview"


 
# Test 7: Delete application - gone after deletion
 
def test_delete_application(client, auth_headers):
    client.post("/applications", json=SAMPLE_APPLICATION, headers=auth_headers)

    list_resp = client.get("/applications", headers=auth_headers)
    app_id = list_resp.json()["items"][0]["id"]

    # Delete
    del_resp = client.delete(f"/applications/{app_id}", headers=auth_headers)
    assert del_resp.status_code == 204

    # Re-fetch must return 404
    get_resp = client.get(f"/applications/{app_id}", headers=auth_headers)
    assert get_resp.status_code == 404


 
# Test 8: Authorization / Ownership - User B cannot touch User A's data
 
def test_user_cannot_access_other_users_application(client, auth_headers, auth_headers_b):
    # User A creates an application
    client.post("/applications", json=SAMPLE_APPLICATION, headers=auth_headers)

    list_resp = client.get("/applications", headers=auth_headers)
    app_id = list_resp.json()["items"][0]["id"]

    update_payload = {
        "company": "Evil Corp",
        "role": "Hacker",
        "salary": 200000,
        "status": "Offer",
    }

    # --- User B attempts to READ User A's application ---
    read_resp = client.get(f"/applications/{app_id}", headers=auth_headers_b)
    assert read_resp.status_code in (403, 404), (
        f"Expected 403 or 404 but got {read_resp.status_code}: {read_resp.text}"
    )

    # --- User B attempts to UPDATE User A's application ---
    update_resp = client.put(f"/applications/{app_id}", json=update_payload, headers=auth_headers_b)
    assert update_resp.status_code in (403, 404), (
        f"Expected 403 or 404 but got {update_resp.status_code}: {update_resp.text}"
    )

    # --- User B attempts to DELETE User A's application ---
    delete_resp = client.delete(f"/applications/{app_id}", headers=auth_headers_b)
    assert delete_resp.status_code in (403, 404), (
        f"Expected 403 or 404 but got {delete_resp.status_code}: {delete_resp.text}"
    )

    # --- Confirm User A's application is still intact after all attack attempts ---
    verify_resp = client.get(f"/applications/{app_id}", headers=auth_headers)
    assert verify_resp.status_code == 200
    assert verify_resp.json()["company"] == SAMPLE_APPLICATION["company"]
