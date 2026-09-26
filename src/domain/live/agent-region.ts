export const AGENT_HOST = "agents.us.assemblyai.com"

export const AGENT_API_BASE = `https://${AGENT_HOST}/v1`

export const AGENT_SOCKET_URL = `wss://${AGENT_HOST}/v1/ws`

export const AGENT_REGION_NOTE =
  "stored agents live in one vendor region: an agent created through agents.us.assemblyai.com is served by that host and answers 404 and agent_not_found through agents.eu.assemblyai.com, while a token minted in either region opens a socket in both. The unqualified agents.assemblyai.com routes each client to its nearest region, so a server in the US and a browser in Europe reached two different stores and every live call from Europe failed with agent_not_found. The server and the browser therefore both name one regional host. Measured 26 September 2026 with one key: created via the US host, read back 200 via the US host and 404 via the EU host; a US socket loaded it on a US token and on an EU token, an EU socket did not"
