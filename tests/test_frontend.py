"""
Frontend integration tests.
Verifies that static frontend assets and index.html are served correctly
without interfering with existing API endpoints.
"""

def test_frontend_index_served(client):
    response = client.get("/")
    assert response.status_code == 200
    assert "text/html" in response.headers.get("content-type", "")
    assert "Job Application Tracker" in response.text
    assert "auth-container-slot" in response.text
    assert "dashboard-container-slot" in response.text
    assert "analytics-container-slot" in response.text


def test_frontend_assets_served(client):
    for css_file in [
        "/css/style.css",
        "/css/base.css",
        "/css/layout.css",
        "/css/components.css",
        "/css/pages.css",
    ]:
        res = client.get(css_file)
        assert res.status_code == 200, f"Failed to fetch {css_file}"
        assert "text/css" in res.headers.get("content-type", ""), f"{css_file} not text/css MIME"

    for js_file in [
        "/js/api.js",
        "/js/ui.js",
        "/js/auth.js",
        "/js/applications.js",
        "/js/interviews.js",
        "/js/resume.js",
        "/js/analytics.js",
        "/js/components-loader.js",
        "/js/app.js",
    ]:
        res = client.get(js_file)
        assert res.status_code == 200, f"Failed to fetch {js_file}"
        assert "javascript" in res.headers.get("content-type", ""), f"{js_file} not javascript MIME"

    for component_file in [
        "/components/header.html",
        "/components/auth-view.html",
        "/components/dashboard-view.html",
        "/components/analytics-view.html",
        "/components/modals.html",
    ]:
        res = client.get(component_file)
        assert res.status_code == 200, f"Failed to fetch {component_file}"
        assert "text/html" in res.headers.get("content-type", ""), f"{component_file} not text/html MIME"


def test_api_routes_not_shadowed(client):
    # API route /health must still return JSON, not index.html
    health_res = client.get("/health")
    assert health_res.status_code == 200
    assert health_res.json() == {"status": "ok"}
