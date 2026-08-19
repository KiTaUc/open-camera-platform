import dgram from 'node:dgram';

export function createOnvifProbe(messageId = crypto.randomUUID()) {
  const id = messageId.startsWith('urn:uuid:') ? messageId : `urn:uuid:${messageId}`;
  return `<?xml version="1.0" encoding="UTF-8"?><s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope" xmlns:a="http://www.w3.org/2005/08/addressing" xmlns:d="http://docs.oasis-open.org/ws-dd/ns/discovery/2009/01" xmlns:dn="http://www.onvif.org/ver10/network/wsdl"><s:Header><a:Action>http://docs.oasis-open.org/ws-dd/ns/discovery/2009/01/Probe</a:Action><a:MessageID>${id}</a:MessageID><a:To>urn:docs-oasis-open-org:ws-dd:ns:discovery:2009:01</a:To></s:Header><s:Body><d:Probe><d:Types>dn:NetworkVideoTransmitter</d:Types></d:Probe></s:Body></s:Envelope>`;
}

export function parseProbeMatch(xml) {
  const xaddrs = [...xml.matchAll(/<[^>]*XAddrs[^>]*>([^<]+)<\/[^>]*XAddrs>/g)].flatMap(match => match[1].trim().split(/\s+/));
  return [...new Set(xaddrs)].filter(address => /^https?:\/\//.test(address));
}

export async function discoverOnvif({ timeoutMs = 1500, socketFactory = () => dgram.createSocket('udp4') } = {}) {
  if (!Number.isInteger(timeoutMs) || timeoutMs < 250 || timeoutMs > 5000) throw new Error('Таймаут поиска должен быть от 250 до 5000 мс');
  const socket = socketFactory();
  const found = new Set();
  return await new Promise((resolve, reject) => {
    const finish = () => { socket.close(); resolve([...found]); };
    const timer = setTimeout(finish, timeoutMs);
    socket.on('message', message => parseProbeMatch(message.toString()).forEach(address => found.add(address)));
    socket.on('error', error => { clearTimeout(timer); socket.close(); reject(error); });
    socket.bind(0, () => socket.send(Buffer.from(createOnvifProbe()), 3702, '239.255.255.250'));
  });
}
