import net from 'net';

function createUsbmuxdPacket(tag, plistXml) {
  const payload = Buffer.from(plistXml, 'utf-8');
  const length = 16 + payload.length;
  const header = Buffer.alloc(16);
  header.writeUInt32LE(length, 0);
  header.writeUInt32LE(1, 4); // version 1
  header.writeUInt32LE(8, 8); // request = 8 (PLIST)
  header.writeUInt32LE(tag, 12);
  return Buffer.concat([header, payload]);
}

function htons(port) {
  return ((port & 0xff) << 8) | ((port >> 8) & 0xff);
}

// Simple lockdown message (4-byte length prefix in big-endian, followed by XML)
function createLockdownPacket(plistXml) {
  const payload = Buffer.from(plistXml, 'utf-8');
  const header = Buffer.alloc(4);
  header.writeUInt32BE(payload.length, 0);
  return Buffer.concat([header, payload]);
}

async function testLockdown(deviceId) {
  return new Promise((resolve) => {
    const client = net.createConnection({ port: 27015, host: '127.0.0.1' }, () => {
      // Send connect request to Lockdown port 62078
      const portBE = htons(62078);
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>MessageType</key>
    <string>Connect</string>
    <key>ClientVersionString</key>
    <string>usbmuxd-client</string>
    <key>ProgName</key>
    <string>Mobotech</string>
    <key>DeviceID</key>
    <integer>${deviceId}</integer>
    <key>PortNumber</key>
    <integer>${portBE}</integer>
</dict>
</plist>`;
      client.write(createUsbmuxdPacket(2, xml));
    });

    let phase = 'connect_response';
    let buffer = Buffer.alloc(0);

    client.on('data', (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);

      if (phase === 'connect_response') {
        if (buffer.length >= 16) {
          const totalLen = buffer.readUInt32LE(0);
          if (buffer.length >= totalLen) {
            const resp = buffer.slice(16, totalLen).toString('utf-8');
            console.log('Connect response:\n', resp);
            buffer = buffer.slice(totalLen);
            phase = 'lockdown';

            // Send GetValue request
            const queryXml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>Mobotech</string>
    <key>Request</key>
    <string>GetValue</string>
</dict>
</plist>`;
            client.write(createLockdownPacket(queryXml));
          }
        }
      } else if (phase === 'lockdown') {
        if (buffer.length >= 4) {
          const payloadLen = buffer.readUInt32BE(0);
          if (buffer.length >= 4 + payloadLen) {
            const xml = buffer.slice(4, 4 + payloadLen).toString('utf-8');
            client.end();
            resolve(xml);
          }
        }
      }
    });

    client.on('error', (err) => {
      console.log('Error:', err.message);
      resolve(null);
    });

    setTimeout(() => {
      client.destroy();
      resolve(null);
    }, 4000);
  });
}

testLockdown(282).then((xml) => {
  console.log('Lockdown result:\n', xml);
});
