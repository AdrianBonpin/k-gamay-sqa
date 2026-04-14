// In-memory JWT denylist keyed by jti. Resets on server restart (acceptable for demo).

const revoked = new Set();

function revoke(jti) {
  if (typeof jti === 'string' && jti.length > 0) {
    revoked.add(jti);
  }
}

function isRevoked(jti) {
  return typeof jti === 'string' && revoked.has(jti);
}

function _clear() {
  revoked.clear();
}

module.exports = { revoke, isRevoked, _clear };
