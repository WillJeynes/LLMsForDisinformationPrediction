import { forwardRef, useImperativeHandle, useRef } from "react";
import { FloatingPanel } from "./FloatingPanel";

export const DetailsPanel = forwardRef(function DetailsPanel(
  { selectedNode, data }, ref) {
  const fpref = useRef();

  useImperativeHandle(ref, () => ({
    open: () => { fpref.current.open() },
  }));

  return (
    <FloatingPanel title="Details" ref={fpref}>

      {selectedNode ? (
        <div className="space-y-3">
          <p>
            <strong>Type:</strong> {selectedNode.type_nice} Cluster
          </p>

          <p>
            <strong>Title:</strong> {selectedNode.label}
          </p>

          {selectedNode.members && (
            <div>
              <p className="font-semibold">Members:</p>
              <ul className="list-disc list-inside text-sm">
                {selectedNode.members.map((m) => {
                  const memberData =
                    data.claims.find((c) => c.id === m) ||
                    data.events.find((e) => e.id === m);

                  return (
                    <li key={m}>
                      {memberData ? memberData.text : m}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-gray-500">
          Click a node to see details
        </p>
      )}
    </FloatingPanel>
  );
})