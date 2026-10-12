let channel = null, handler = () => {};
const tab = Math.random().toString(36).slice(2);
export function connect(name, onMessage) {
 channel?.close();
 handler = onMessage;
 channel = 'BroadcastChannel' in self ? new BroadcastChannel('ck-sync:'+name) : null;
 if(channel) channel.onmessage = event => { if(event.data?.tab!==tab) handler(event.data); };
 announce({type:'hello'});
}
export function announce(message) {
 try { channel?.postMessage({...message, tab}); } catch {}
}
