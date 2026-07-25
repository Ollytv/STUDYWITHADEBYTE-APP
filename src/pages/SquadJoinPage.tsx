// src/pages/SquadJoinPage.tsx

import { useParams, useNavigate } from 'react-router-dom';
import { ROUTES } from '../routes';
import { JoinSquadScreen } from '../components/JoinSquadScreen';

export default function SquadJoinPage() {
  const { squadId } = useParams<{ squadId: string }>();
  const navigate = useNavigate();

  if (!squadId) {
    navigate(ROUTES.app.squads, { replace: true });
    return null;
  }

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center px-5">
      <JoinSquadScreen
        squadId={squadId}
        onJoined={() => navigate(ROUTES.app.squads, { replace: true })}
        onCancel={() => navigate(ROUTES.app.squads, { replace: true })}
      />
    </div>
  );
}
