import { useState } from 'react';
import { LIMITS } from '@channel-green/shared';
import { registry } from '@cg/lib/registry';
import { useGame, useSnap } from '@cg/game/useSession';

export function RoomsPanel() {
  const game = useGame();
  const s = useSnap();
  const [map, setMap] = useState('living-room');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const maps = Object.values(registry.maps).filter((m) => m.allowPrivate);
  const room = s.room;
  const isHost = !!s.me && (room?.hostPid === s.me.pid || s.moderator);
  const priv = room?.mode === 'invite';

  return (
    <div className="space-y-5 text-sm">
      <section>
        <h3 className="font-pixel text-orange">Here</h3>
        <p>{room?.name || registry.maps[s.mapId]?.name} - {room?.population} of {room?.capacity}</p>
        {priv && room?.code && (
          <p className="mt-1">Code: <strong className="font-pixel text-neon tracking-widest">{room.code}</strong> <button className="btn btn-sm btn-quiet" onClick={() => navigator.clipboard?.writeText(room.code!)}>Copy</button></p>
        )}
        {priv && (
          <button className="btn btn-sm mt-2" onClick={() => void game.leaveRoom()}>Leave private room</button>
        )}
        {isHost && priv && (
          <div className="mt-2 flex flex-wrap gap-1">
            <button className="btn btn-sm" onClick={() => void game.mod(room?.locked ? 'unlock' : 'lock')}>{room?.locked ? 'Unlock door' : 'Lock door'}</button>
            <button className="btn btn-sm" onClick={() => void game.mod(room?.silenced ? 'unsilence-room' : 'silence-room')}>{room?.silenced ? 'End quiet hour' : 'Quiet hour'}</button>
          </div>
        )}
      </section>

      <section>
        <h3 className="font-pixel text-orange">Make a private room</h3>
        <p className="text-olive-soft">Only people with the code can come in.</p>
        <label className="mt-2 block">Room
          <select className="field mt-1" value={map} onChange={(e) => setMap(e.target.value)}>
            {maps.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </label>
        <label className="mt-2 block">Name (optional)
          <input className="field mt-1" value={name} maxLength={LIMITS.roomNameMax} onChange={(e) => setName(e.target.value)} />
        </label>
        <button className="btn btn-primary mt-2" onClick={() => void game.createRoom(map, name.trim() || undefined)}>Create</button>
      </section>

      <section>
        <h3 className="font-pixel text-orange">Join with a code</h3>
        <form className="mt-1 flex gap-1" onSubmit={(e) => { e.preventDefault(); if (code.trim()) void game.joinRoom(code); }}>
          <input className="field flex-1 uppercase" value={code} maxLength={12} placeholder="CODE" onChange={(e) => setCode(e.target.value)} aria-label="Room code" />
          <button className="btn btn-primary" type="submit">Join</button>
        </form>
      </section>
    </div>
  );
}
