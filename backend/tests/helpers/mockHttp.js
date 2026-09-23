function createMockResponse() {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
    setHeader(name, value) {
      this.headers[name] = value;
      return this;
    },
    send(data) {
      this.body = data;
      return this;
    }
  };
  return res;
}

function createMockRequest(options = {}) {
  return {
    body: options.body || {},
    params: options.params || {},
    query: options.query || {},
    headers: options.headers || {},
    user: options.user || null,
    header(name) {
      const lower = name.toLowerCase();
      for (const [k, v] of Object.entries(this.headers)) {
        if (k.toLowerCase() === lower) return v;
      }
      return undefined;
    }
  };
}

module.exports = {
  createMockResponse,
  createMockRequest
};
