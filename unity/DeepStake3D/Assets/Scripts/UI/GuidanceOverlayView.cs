using DeepStake.Core;
using DeepStake.Interaction;
using DeepStake.Quests;
using DeepStake.Settlement;
using DeepStake.World;
using UnityEngine;
using UnityEngine.UI;

namespace DeepStake.UI
{
    public sealed class GuidanceOverlayView : MonoBehaviour
    {
        [SerializeField] private Canvas targetCanvas;

        private WorldPrototype3DController worldController;
        private Camera mainCamera;
        private Text zoneChipText;
        private Text pressureChipText;
        private Text missionBarText;
        private Text actionCardText;
        private Text toastText;
        private GameObject toastRoot;
        private GameObject journalRoot;
        private Text journalText;
        private Text signMarkerText;
        private Text supplyMarkerText;
        private Text observerMarkerText;
        private Text npcMarkerText;
        private Text workerMarkerText;
        private Text beaconMarkerText;
        private Text relayMarkerText;
        private string lastToastMessage = string.Empty;
        private float toastUntil;

        public void Configure(Canvas canvas)
        {
            targetCanvas = canvas;
        }

        private void Start()
        {
            if (targetCanvas == null)
            {
                targetCanvas = GetComponentInParent<Canvas>();
            }

            worldController = FindFirstObjectByType<WorldPrototype3DController>();
            mainCamera = Camera.main;
            Build();
        }

        private void Update()
        {
            if (DeepStakeGameState.Instance == null || missionBarText == null)
            {
                return;
            }

            if (mainCamera == null)
            {
                mainCamera = Camera.main;
            }

            var save = DeepStakeGameState.Instance.CurrentSave;
            zoneChipText.text = save.CurrentZoneLabel;
            pressureChipText.text = GetPressureHintText(save.ActivePressureHint);
            missionBarText.text = QuestCatalog.GetPrimaryMissionObjective(save);
            actionCardText.text = BuildActionCardText(save);
            journalRoot.SetActive(DeepStakeGameState.Instance.JournalVisible);
            journalText.text = BuildJournalText(save);
            UpdateToast();
            UpdateMarkers();
        }

        private void Build()
        {
            if (targetCanvas == null)
            {
                return;
            }

            var mobile = Application.isMobilePlatform;
            var zoneChip = CreatePanel("ZoneChip", mobile ? new Vector2(250f, 44f) : new Vector2(380f, 46f), new Vector2(14f, -14f), new Vector2(0f, 1f), new Vector2(0f, 1f), new Color(0.12f, 0.18f, 0.14f, mobile ? 0.76f : 0.88f));
            zoneChipText = CreateText(zoneChip.transform, "ZoneChipText", mobile ? 16 : 22, TextAnchor.MiddleLeft);

            var missionBar = CreatePanel("MissionBar", mobile ? new Vector2(520f, 54f) : new Vector2(760f, 58f), new Vector2(0f, -14f), new Vector2(0.5f, 1f), new Vector2(0.5f, 1f), new Color(0.04f, 0.08f, 0.12f, mobile ? 0.76f : 0.88f));
            missionBarText = CreateText(missionBar.transform, "MissionBarText", mobile ? 18 : 22, TextAnchor.MiddleCenter);

            var pressureChip = CreatePanel("PressureChip", mobile ? new Vector2(340f, 54f) : new Vector2(480f, 58f), new Vector2(-16f, -14f), new Vector2(1f, 1f), new Vector2(1f, 1f), new Color(0.16f, 0.11f, 0.08f, mobile ? 0.74f : 0.84f));
            pressureChipText = CreateText(pressureChip.transform, "PressureChipText", mobile ? 15 : 20, TextAnchor.MiddleLeft);

            var actionCard = CreatePanel("ActionCard", mobile ? new Vector2(420f, 42f) : new Vector2(700f, 56f), mobile ? new Vector2(0f, 42f) : new Vector2(0f, 78f), new Vector2(0.5f, 0f), new Vector2(0.5f, 0f), new Color(0.04f, 0.08f, 0.12f, mobile ? 0.62f : 0.84f));
            actionCardText = CreateText(actionCard.transform, "ActionCardText", mobile ? 14 : 20, TextAnchor.MiddleCenter);

            toastRoot = CreatePanel("ToastPanel", mobile ? new Vector2(500f, 80f) : new Vector2(620f, 72f), new Vector2(-30f, -28f), new Vector2(1f, 1f), new Vector2(1f, 1f), new Color(0.12f, 0.18f, 0.22f, 0.92f)).gameObject;
            toastText = CreateText(toastRoot.transform, "ToastText", mobile ? 20 : 22, TextAnchor.MiddleCenter);
            toastRoot.SetActive(false);

            journalRoot = CreatePanel("JournalPanel", mobile ? new Vector2(450f, 300f) : new Vector2(500f, 340f), new Vector2(-24f, mobile ? -118f : -110f), new Vector2(1f, 1f), new Vector2(1f, 1f), new Color(0.02f, 0.05f, 0.08f, 0.9f)).gameObject;
            journalText = CreateText(journalRoot.transform, "JournalText", mobile ? 18 : 20, TextAnchor.UpperLeft);
            journalRoot.SetActive(false);

            signMarkerText = CreateMarker("SignMarker");
            supplyMarkerText = CreateMarker("SupplyMarker");
            observerMarkerText = CreateMarker("ObserverMarker");
            npcMarkerText = CreateMarker("NpcMarker");
            workerMarkerText = CreateMarker("WorkerMarker");
            beaconMarkerText = CreateMarker("BeaconMarker");
            relayMarkerText = CreateMarker("RelayMarker");
        }

        private void UpdateToast()
        {
            var toastMessage = DeepStakeGameState.Instance.ToastMessage;
            if (!string.IsNullOrWhiteSpace(toastMessage) && toastMessage != lastToastMessage)
            {
                lastToastMessage = toastMessage;
                toastUntil = Time.unscaledTime + 2.4f;
                toastText.text = toastMessage;
                toastRoot.SetActive(true);
            }

            if (toastRoot.activeSelf && Time.unscaledTime > toastUntil)
            {
                toastRoot.SetActive(false);
                DeepStakeGameState.Instance.ClearToast();
            }
        }

        private void UpdateMarkers()
        {
            if (worldController == null || mainCamera == null)
            {
                return;
            }

            var save = DeepStakeGameState.Instance.CurrentSave;
            HideMarker(signMarkerText);
            HideMarker(supplyMarkerText);
            HideMarker(observerMarkerText);
            HideMarker(npcMarkerText);
            HideMarker(workerMarkerText);
            HideMarker(beaconMarkerText);
            HideMarker(relayMarkerText);

            if (!save.StoryFlags.ReadFieldNoticeBoard)
            {
                UpdateMarker(signMarkerText, worldController.PrimaryInteractable != null ? worldController.PrimaryInteractable.transform : null, "Notice", true);
                return;
            }

            if (!save.StoryFlags.MetArchivist)
            {
                UpdateMarker(npcMarkerText, worldController.QuestNpc != null ? worldController.QuestNpc.transform : null, Application.isMobilePlatform ? "Sena" : "Archivist", true);
                return;
            }

            if (!save.StoryFlags.ReviewedSupplyCrate)
            {
                UpdateMarker(supplyMarkerText, worldController.SecondaryInteractable != null ? worldController.SecondaryInteractable.transform : null, Application.isMobilePlatform ? "Crate" : "Supply", true);
                return;
            }

            if (!save.StoryFlags.PlacedRecoveryBeacon)
            {
                UpdateMarker(beaconMarkerText, worldController.PrimaryPlacement != null ? worldController.PrimaryPlacement.transform : null, "Beacon", true);
                return;
            }

            if (!save.StoryFlags.MetFieldHand)
            {
                UpdateMarker(workerMarkerText, worldController.SecondaryQuestNpc != null ? worldController.SecondaryQuestNpc.transform : null, "Mara", true);
                return;
            }

            if (!save.StoryFlags.ReviewedObserverRecord)
            {
                UpdateMarker(observerMarkerText, worldController.TertiaryInteractable != null ? worldController.TertiaryInteractable.transform : null, "Record", true);
                return;
            }

            if (!HasSettlementObject(save, "supply-relay"))
            {
                UpdateMarker(relayMarkerText, worldController.SecondaryPlacement != null ? worldController.SecondaryPlacement.transform : null, "Relay", true);
            }
        }

        private static void HideMarker(Text marker)
        {
            if (marker != null)
            {
                marker.gameObject.SetActive(false);
            }
        }

        private void UpdateMarker(Text marker, Transform target, string label, bool visible)
        {
            if (marker == null || target == null || mainCamera == null || !visible)
            {
                if (marker != null)
                {
                    marker.gameObject.SetActive(false);
                }
                return;
            }

            var screenPoint = mainCamera.WorldToScreenPoint(target.position + Vector3.up * (Application.isMobilePlatform ? 1.38f : 1.8f));
            if (screenPoint.z <= 0f)
            {
                marker.gameObject.SetActive(false);
                return;
            }

            marker.gameObject.SetActive(true);
            marker.text = Application.isMobilePlatform ? label.ToUpperInvariant() : label;
            marker.rectTransform.position = screenPoint;
        }

        private string BuildActionCardText(DeepStake.Contracts.DeepStakeSaveData save)
        {
            var nearby = DeepStakeGameState.Instance.NearbyTargetLabel;
            var prompt = ShortPrompt(DeepStakeGameState.Instance.InteractionPrompt);
            if (Application.isMobilePlatform)
            {
                if (!string.IsNullOrWhiteSpace(prompt) && !prompt.StartsWith("Move", System.StringComparison.OrdinalIgnoreCase))
                {
                    return prompt;
                }

                return nearby == "None" ? "Touch move  Hold Run" : nearby;
            }

            if (!string.IsNullOrWhiteSpace(prompt) &&
                !prompt.StartsWith("WASD", System.StringComparison.OrdinalIgnoreCase) &&
                !prompt.StartsWith("Move", System.StringComparison.OrdinalIgnoreCase) &&
                !prompt.StartsWith("Touch controls", System.StringComparison.OrdinalIgnoreCase))
            {
                return prompt;
            }

            if (nearby != "None")
            {
                return "Nearby  " + nearby;
            }

            return "WASD Move  Shift Run";
        }

        private string BuildJournalText(DeepStake.Contracts.DeepStakeSaveData save)
        {
            var objectives = QuestCatalog.GetObjectiveChecklist(save, "first-harvest");
            var text = "Longest Dawn Journal\n\n";
            text += "QUEST\n";
            for (var index = 0; index < objectives.Length; index++)
            {
                text += objectives[index] + "\n";
            }

            text += "\nFACTION / PRESSURE\n";
            text += "Dominant  " + save.WorldPressure.DominantFactionId + "\n";
            text += "Debt  " + save.WorldPressure.LocalDebtPressure +
                    " | Supply  " + save.WorldPressure.SupplyChainPressure +
                    " | Fog  " + save.WorldPressure.MediaFogPressure + "\n";
            text += save.ActivePressureHint + "\n";

            text += "\nSETTLEMENT\n";
            text += "Objects  " + save.Settlement.Objects.Count + "\n";
            text += "Theme  " + save.Settlement.Theme + "\n";
            for (var index = 0; index < save.Settlement.RestoredStructures.Count; index++)
            {
                text += "- " + save.Settlement.RestoredStructures[index] + "\n";
            }
            return text;
        }

        private static bool HasSettlementObject(DeepStake.Contracts.DeepStakeSaveData save, string type)
        {
            for (var index = 0; index < save.Settlement.Objects.Count; index++)
            {
                if (save.Settlement.Objects[index].Type == type)
                {
                    return true;
                }
            }

            return false;
        }

        private static string GetPressureHintText(string hint)
        {
            if (string.IsNullOrWhiteSpace(hint))
            {
                return Application.isMobilePlatform ? "Pressure trace active." : "Pressure trace active across local records.";
            }

            var periodIndex = hint.IndexOf('.');
            if (periodIndex > 0)
            {
                hint = hint.Substring(0, periodIndex + 1);
            }

            return hint.Length > 88 ? hint.Substring(0, 88) + "..." : hint;
        }

        private static string ShortPrompt(string prompt)
        {
            if (string.IsNullOrWhiteSpace(prompt))
            {
                return string.Empty;
            }

            if (prompt.Length <= 56)
            {
                return prompt;
            }

            return prompt.Substring(0, 56) + "...";
        }

        private RectTransform CreatePanel(string name, Vector2 size, Vector2 anchoredPosition, Vector2 anchorMin, Vector2 anchorMax, Color color)
        {
            var panelObject = new GameObject(name);
            panelObject.transform.SetParent(targetCanvas.transform, false);
            var rect = panelObject.AddComponent<RectTransform>();
            rect.sizeDelta = size;
            rect.anchoredPosition = anchoredPosition;
            rect.anchorMin = anchorMin;
            rect.anchorMax = anchorMax;
            rect.pivot = anchorMax;
            var image = panelObject.AddComponent<Image>();
            image.color = color;
            return rect;
        }

        private Text CreateText(Transform parent, string name, int fontSize, TextAnchor alignment)
        {
            var textObject = new GameObject(name);
            textObject.transform.SetParent(parent, false);
            var rect = textObject.AddComponent<RectTransform>();
            rect.anchorMin = Vector2.zero;
            rect.anchorMax = Vector2.one;
            rect.offsetMin = new Vector2(18f, 12f);
            rect.offsetMax = new Vector2(-18f, -12f);
            var text = textObject.AddComponent<Text>();
            text.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            text.fontSize = fontSize;
            text.alignment = alignment;
            text.color = new Color(0.98f, 0.97f, 0.93f, 1f);
            text.horizontalOverflow = HorizontalWrapMode.Wrap;
            text.verticalOverflow = VerticalWrapMode.Overflow;
            return text;
        }

        private Text CreateMarker(string name)
        {
            var markerObject = new GameObject(name);
            markerObject.transform.SetParent(targetCanvas.transform, false);
            var rect = markerObject.AddComponent<RectTransform>();
            rect.sizeDelta = Application.isMobilePlatform ? new Vector2(96f, 32f) : new Vector2(96f, 28f);
            var text = markerObject.AddComponent<Text>();
            text.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            text.fontSize = Application.isMobilePlatform ? 20 : 18;
            text.alignment = TextAnchor.MiddleCenter;
            text.color = Application.isMobilePlatform
                ? new Color(0.93f, 0.85f, 0.64f, 1f)
                : new Color(0.9f, 0.82f, 0.6f, 1f);
            text.horizontalOverflow = HorizontalWrapMode.Overflow;
            text.verticalOverflow = VerticalWrapMode.Overflow;
            var outline = markerObject.AddComponent<Outline>();
            outline.effectColor = new Color(0f, 0f, 0f, 0.92f);
            outline.effectDistance = Application.isMobilePlatform ? new Vector2(1.4f, -1.4f) : new Vector2(1f, -1f);
            text.text = string.Empty;
            markerObject.SetActive(false);
            return text;
        }
    }
}
