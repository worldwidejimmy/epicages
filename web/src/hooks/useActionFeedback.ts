import { useGameStore } from "../state";
import { validateAction } from "../validation";
import type { PlayerProposal } from "../../shared/types";

export function useActionFeedback() {
  const world = useGameStore(s => s.world);
  const send = useGameStore(s => s.send);
  const addUserAction = useGameStore(s => s.addUserAction);

  const executeAction = (proposal: PlayerProposal, actionDetails: string) => {
    // Validate first
    const validation = validateAction(world, proposal);
    
    if (!validation.ok) {
      // Add error action immediately
      addUserAction({
        actionType: proposal.action,
        actionDetails,
        status: 'error',
        message: validation.error
      });
      return;
    }

    // Add pending action
    addUserAction({
      actionType: proposal.action,
      actionDetails,
      status: 'pending',
      message: `Attempting to ${actionDetails.toLowerCase()}...`
    });

    // Send to server
    send({ type: "proposal", proposal });
  };

  return { executeAction };
}
