using DeepStake.Core;
using UnityEngine;

namespace DeepStake.Interaction
{
    public sealed class Interactable3DStub : MonoBehaviour
    {
        [SerializeField] private string interactId = "farm-sign";
        [SerializeField] private string interactLabel = "Authority Notice";
        [SerializeField] private string promptVerb = "Inspect";
        [SerializeField] [TextArea] private string interactMessage =
            "The field waits for the first cycle of restoration.";
        [SerializeField] private string questState = string.Empty;
        [SerializeField] private float interactionRange = 2.35f;

        public void Configure(string nextId, string nextLabel, string nextMessage)
        {
            interactId = nextId;
            interactLabel = nextLabel;
            interactMessage = nextMessage;
        }

        public void Configure(string nextId, string nextLabel, string nextMessage, string nextQuestState)
        {
            interactId = nextId;
            interactLabel = nextLabel;
            interactMessage = nextMessage;
            questState = nextQuestState;
        }

        public void Configure(string nextId, string nextLabel, string nextPromptVerb, string nextMessage, string nextQuestState)
        {
            interactId = nextId;
            interactLabel = nextLabel;
            promptVerb = nextPromptVerb;
            interactMessage = nextMessage;
            questState = nextQuestState;
        }

        public bool CanInteract(Transform actor)
        {
            return GetDistance(actor) <= interactionRange;
        }

        public float GetDistance(Transform actor)
        {
            if (actor == null)
            {
                return float.MaxValue;
            }

            var actorFlat = new Vector3(actor.position.x, transform.position.y, actor.position.z);
            return Vector3.Distance(actorFlat, transform.position);
        }

        public string GetPrompt()
        {
            return "E " + promptVerb + "  " + GetShortLabel();
        }

        public string GetLabel()
        {
            return interactLabel;
        }

        public string GetShortLabel()
        {
            if (interactId == "farm-sign")
            {
                return "Authority Notice";
            }

            if (interactId == "supply-cache")
            {
                return "Crate";
            }

            if (interactId == "observer-record")
            {
                return "Record";
            }

            return interactLabel.Length > 14 ? interactLabel.Substring(0, 14) : interactLabel;
        }

        public void Trigger()
        {
            if (DeepStakeGameState.Instance != null)
            {
                var save = DeepStakeGameState.Instance.CurrentSave;
                var statusSummary = interactLabel + " inspected.";
                if (interactId == "farm-sign")
                {
                    save.StoryFlags.ReadFieldNoticeBoard = true;
                    save.StoryFlags.LearnedDirectoratePressure = true;
                    save.ActivePressureHint = "The authority notice still carries a recovery order, but the same Directorate filing mark has been stamped across land transfer and debt notices nearby.";
                    statusSummary = "Authority notice recorded.";
                }
                else if (interactId == "supply-cache")
                {
                    save.StoryFlags.ReviewedSupplyCrate = true;
                    save.WorldPressure.SupplyChainPressure = Mathf.Max(0, save.WorldPressure.SupplyChainPressure - 3);
                    save.WorldPressure.MediaFogPressure = Mathf.Max(0, save.WorldPressure.MediaFogPressure - 1);
                    save.WorldPressure.SettlementInfluencePressure = Mathf.Max(0, save.WorldPressure.SettlementInfluencePressure - 1);
                    save.ActivePressureHint = "The supply crates confirm deliberate delay and re-stamping. Directorate pressure is no longer rumor; it is visible in the route sheets.";
                    if (!save.Settlement.RestoredStructures.Contains("supply-ledger-trace"))
                    {
                        save.Settlement.RestoredStructures.Add("supply-ledger-trace");
                    }
                    statusSummary = "Supply route tampering recorded.";
                }
                else if (interactId == "observer-record")
                {
                    save.StoryFlags.ReviewedObserverRecord = true;
                    save.WorldPressure.MediaFogPressure = Mathf.Max(0, save.WorldPressure.MediaFogPressure - 2);
                    save.WorldPressure.LandSeizurePressure = Mathf.Max(0, save.WorldPressure.LandSeizurePressure - 2);
                    save.ActivePressureHint = "The observer case links Longest Dawn to neighboring districts. The same Directorate pattern is propagating beyond one farm edge.";
                    if (!save.Settlement.RestoredStructures.Contains("observer-record-copy"))
                    {
                        save.Settlement.RestoredStructures.Add("observer-record-copy");
                    }
                    statusSummary = "Observer record copied.";
                }

                if (!string.IsNullOrWhiteSpace(questState))
                {
                    UpdateFirstLoopQuest(save, questState);
                }

                save.Alignment.Attunement += 1;
                save.Alignment.AwakeningClarity += interactId == "supply-cache" || interactId == "observer-record" ? 2 : 1;
                save.LastStatus = statusSummary;
                DeepStakeGameState.Instance.UpdateStatus(statusSummary);
            }
        }

        private static void UpdateFirstLoopQuest(DeepStake.Contracts.DeepStakeSaveData save, string status)
        {
            for (var index = 0; index < save.Quests.Count; index++)
            {
                if (save.Quests[index].QuestId != "first-harvest")
                {
                    continue;
                }

                if (save.Quests[index].Status != "completed")
                {
                    save.Quests[index].Status = status;
                }
                return;
            }
        }
    }
}
