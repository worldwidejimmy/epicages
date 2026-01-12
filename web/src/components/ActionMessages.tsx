import { useEffect, useRef } from "react";
import { useGameStore } from "../state";

export default function ActionMessages() {
  const userActions = useGameStore(s => s.userActions);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [userActions]);

  if (userActions.length === 0) {
    return null;
  }

  return (
    <div className="action-messages-section">
      <h3 title="Your action history and status">Actions</h3>
      <div className="action-messages" ref={scrollRef}>
        {userActions.slice().reverse().map(action => (
          <div key={action.id} className={`action-message action-message-${action.status}`}>
            <div className="action-message-status">{action.status === 'pending' ? '⏳' : action.status === 'success' ? '✓' : '✗'}</div>
            <div className="action-message-content">
              <div className="action-message-title">{action.actionDetails}</div>
              <div className="action-message-text">{action.message}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
