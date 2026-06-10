from backend.main import app


def test_success_responses_have_frontend_usable_schemas():
    openapi = app.openapi()

    for path, operations in openapi["paths"].items():
        for method, operation in operations.items():
            if method not in {"get", "post", "patch", "put", "delete"}:
                continue

            schema = operation["responses"]["200"]["content"]["application/json"]["schema"]
            assert schema, f"{method.upper()} {path} has an empty success schema"


def test_casual_fetch_is_public_stateless_get():
    operation = app.openapi()["paths"]["/casual/new"]["get"]

    assert operation.get("security") is None
    assert "requestBody" not in operation


def test_active_rated_game_is_documented_as_nullable():
    schema = app.openapi()["paths"]["/rated/active"]["get"]["responses"]["200"]["content"][
        "application/json"
    ]["schema"]

    assert {"type": "null"} in schema["anyOf"]
