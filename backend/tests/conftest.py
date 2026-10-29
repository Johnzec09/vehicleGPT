import json
import urllib.request
import urllib.error
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.models.db_models import Base
from app.db.demo_data import generate_demo_dataset
from app.db.session import get_db
from app.main import app

# In-memory test SQLite engine
TEST_DATABASE_URL = "sqlite:///:memory:"

@pytest.fixture(scope="session")
def test_engine():
    engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    return engine

@pytest.fixture(scope="function")
def db_session(test_engine):
    connection = test_engine.connect()
    transaction = connection.begin()
    SessionTest = sessionmaker(bind=connection)
    session = SessionTest()

    # Seed test dataset
    generate_demo_dataset(db=session, force=True, days=30)

    yield session

    session.close()
    transaction.rollback()
    connection.close()

class LiveEndpointResponse:
    def __init__(self, status_code: int, data: dict):
        self.status_code = status_code
        self._data = data

    def json(self):
        return self._data

class LiveEndpointClient:
    def __init__(self, base_url: str = "http://127.0.0.1:8000"):
        self.base_url = base_url

    def get(self, path: str):
        req = urllib.request.Request(f"{self.base_url}{path}")
        try:
            with urllib.request.urlopen(req, timeout=5.0) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                return LiveEndpointResponse(resp.status, data)
        except urllib.error.HTTPError as e:
            data = json.loads(e.read().decode("utf-8"))
            return LiveEndpointResponse(e.code, data)

    def post(self, path: str, json_data: dict = None, **kwargs):
        payload = kwargs.get("json", json_data) or {}
        body = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(f"{self.base_url}{path}", data=body)
        req.add_header("Content-Type", "application/json")
        try:
            with urllib.request.urlopen(req, timeout=5.0) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                return LiveEndpointResponse(resp.status, data)
        except urllib.error.HTTPError as e:
            data = json.loads(e.read().decode("utf-8"))
            return LiveEndpointResponse(e.code, data)

@pytest.fixture(scope="function")
def client(db_session):
    return LiveEndpointClient("http://127.0.0.1:8000")
