using DeepStake.CameraRig;
using DeepStake.Boot;
using DeepStake.Characters;
using DeepStake.Combat;
using DeepStake.Core;
using DeepStake.Input;
using DeepStake.Interaction;
using DeepStake.Player;
using DeepStake.Quests;
using DeepStake.Save;
using DeepStake.Settlement;
using DeepStake.UI;
using DeepStake.Rendering;
using System.Collections;
using System.IO;
using UnityEngine;
using UnityEngine.UI;

namespace DeepStake.World
{
    public sealed class WorldPrototype3DController : MonoBehaviour
    {
        [SerializeField] private TextAsset worldPrototypeJson;
        [SerializeField] private TextAsset questCatalogJson;
        [SerializeField] private Transform zoneRoot;
        [SerializeField] private Transform playerTransform;
        [SerializeField] private Transform npcTransform;
        [SerializeField] private Transform secondaryNpcTransform;
        [SerializeField] private Transform interactableTransform;
        [SerializeField] private Transform secondaryInteractableTransform;
        [SerializeField] private Transform tertiaryInteractableTransform;
        [SerializeField] private Transform placementMarkerTransform;
        [SerializeField] private Transform secondaryPlacementMarkerTransform;
        [SerializeField] private Transform placementPreviewRoot;
        [SerializeField] private Transform secondaryPlacementPreviewRoot;
        [SerializeField] private Interactable3DStub primaryInteractable;
        [SerializeField] private Interactable3DStub secondaryInteractable;
        [SerializeField] private Interactable3DStub tertiaryInteractable;
        [SerializeField] private QuestNpc3DStub questNpc;
        [SerializeField] private QuestNpc3DStub secondaryQuestNpc;
        [SerializeField] private Transform monsterTransform;
        [SerializeField] private Monster3DStub monster;
        [SerializeField] private SettlementPlacement3DStub settlementPlacement;
        [SerializeField] private SettlementPlacement3DStub secondarySettlementPlacement;
        [SerializeField] private QuarterViewCameraRig quarterViewCameraRig;
        [SerializeField] private Material fieldMaterial;
        [SerializeField] private Material archiveMaterial;
        [SerializeField] private Material placementMaterial;
        [SerializeField] private Material roadMaterial;
        [SerializeField] private Material storageMaterial;
        [SerializeField] private bool forceMobileControlsInEditor;

        private WorldPrototype3DDefinition definition = new WorldPrototype3DDefinition();
        private string lastPrompt = string.Empty;
        private string lastInputDebug = string.Empty;
        private const float AwarenessRange = 4.5f;
        private const string ScreenshotRequestRelativePath = "Library/DeepStakeAutomation/screenshot_request.json";
        private const string ScreenshotStatusRelativePath = "Library/DeepStakeAutomation/screenshot_status.json";
        private PlayerMover3D playerMover;
        private bool localScreenshotScheduled;
        private bool localScreenshotCoroutineEntered;
        private bool localScreenshotFallbackExecuted;
        private float localScreenshotScheduleRealtime;
        private ScreenshotAutomationRequest pendingScreenshotRequest;

        public Transform PlayerTransform => playerTransform;
        public Interactable3DStub PrimaryInteractable => primaryInteractable;
        public Interactable3DStub SecondaryInteractable => secondaryInteractable;
        public Interactable3DStub TertiaryInteractable => tertiaryInteractable;
        public QuestNpc3DStub QuestNpc => questNpc;
        public QuestNpc3DStub SecondaryQuestNpc => secondaryQuestNpc;
        public Monster3DStub Monster => monster;
        public SettlementPlacement3DStub PrimaryPlacement => settlementPlacement;
        public SettlementPlacement3DStub SecondaryPlacement => secondarySettlementPlacement;

        private void Start()
        {
            Debug.Log("[DeepStakeDev] WorldPrototype3D start requested.");
            definition = WorldPrototype3DDefinition.FromJson(worldPrototypeJson);
            if (questCatalogJson == null)
            {
                questCatalogJson = Resources.Load<TextAsset>("quests-longest-dawn");
            }
            QuestCatalog.Load(questCatalogJson);
            ResolveSceneReferences();
            try
            {
                EnsureInteractiveSceneObjects();
            }
            catch (System.Exception exception)
            {
                Debug.LogError("[DeepStakeDev] EnsureInteractiveSceneObjects failed: " + exception);
            }
            UiRuntimeBootstrap.EnsureEventSystem();
            try
            {
                BuildZoneLandmarks();
            }
            catch (System.Exception exception)
            {
                Debug.LogError("[DeepStakeDev] BuildZoneLandmarks failed: " + exception);
            }

            if (DeepStakeDevLaunchOptions.ForceMobileControlsInEditor)
            {
                forceMobileControlsInEditor = true;
            }

            EnsureMobileControls();
            EnsureGuidanceOverlay();
            HideLegacyHudStatus();

            if (DeepStakeGameState.Instance != null)
            {
                DeepStakeGameState.Instance.SetZone(definition.zoneId, definition.zoneLabel);
            }

            var save = DeepStakeGameState.Instance != null
                ? DeepStakeGameState.Instance.CurrentSave
                : null;

            if (playerTransform != null)
            {
                var spawnX = definition.playerSpawn.x;
                var spawnZ = definition.playerSpawn.z;
                if (save != null && save.Player.MapId == definition.zoneId)
                {
                    spawnX = save.Player.X;
                    spawnZ = save.Player.Y;
                }

                playerTransform.position = new Vector3(spawnX, 0.5f, spawnZ);
                WorldPrototypeVisualPass.EnsureCutePlayerProxy(playerTransform);
            }

            if (npcTransform != null && definition.npcStubs.Length > 0)
            {
                npcTransform.position = new Vector3(definition.npcStubs[0].x, 0.5f, definition.npcStubs[0].z);
                WorldPrototypeVisualPass.EnsureArchivistProxy(npcTransform);
                var archivistView = npcTransform.GetComponent<ArticulatedHumanoidView>();
                if (archivistView != null)
                {
                    archivistView.ForceIdleMotion();
                }
                if (questNpc != null)
                {
                    questNpc.Configure(
                        definition.npcStubs[0].id,
                        definition.npcStubs[0].displayName,
                        definition.npcStubs[0].questId,
                        string.IsNullOrWhiteSpace(definition.npcStubs[0].dialogue)
                            ? definition.npcStubs[0].displayName + " watches the field for the first sign of recovery."
                            : definition.npcStubs[0].dialogue);
                }
            }

            if (secondaryNpcTransform != null && definition.npcStubs.Length > 1)
            {
                secondaryNpcTransform.position = new Vector3(definition.npcStubs[1].x, 0.5f, definition.npcStubs[1].z);
                if (secondaryQuestNpc != null)
                {
                    secondaryQuestNpc.Configure(
                        definition.npcStubs[1].id,
                        definition.npcStubs[1].displayName,
                        definition.npcStubs[1].questId,
                        string.IsNullOrWhiteSpace(definition.npcStubs[1].dialogue)
                            ? definition.npcStubs[1].displayName + " keeps the lane workable while the archive catches up."
                            : definition.npcStubs[1].dialogue);
                }
            }

            if (interactableTransform != null && definition.interactables.Length > 0)
            {
                interactableTransform.position = new Vector3(definition.interactables[0].x, 0.75f, definition.interactables[0].z);
                if (primaryInteractable != null)
                {
                    primaryInteractable.Configure(
                        definition.interactables[0].id,
                        definition.interactables[0].label,
                        definition.interactables[0].promptLabel,
                        definition.interactables[0].message,
                        definition.interactables[0].questState);
                }
            }

            if (secondaryInteractableTransform != null && definition.interactables.Length > 1)
            {
                secondaryInteractableTransform.position = new Vector3(definition.interactables[1].x, 0.75f, definition.interactables[1].z);
                if (secondaryInteractable != null)
                {
                    secondaryInteractable.Configure(
                        definition.interactables[1].id,
                        definition.interactables[1].label,
                        definition.interactables[1].promptLabel,
                        definition.interactables[1].message,
                        definition.interactables[1].questState);
                }
            }

            if (tertiaryInteractableTransform != null && definition.interactables.Length > 2)
            {
                tertiaryInteractableTransform.position = new Vector3(definition.interactables[2].x, 0.75f, definition.interactables[2].z);
                if (tertiaryInteractable != null)
                {
                    tertiaryInteractable.Configure(
                        definition.interactables[2].id,
                        definition.interactables[2].label,
                        definition.interactables[2].promptLabel,
                        definition.interactables[2].message,
                        definition.interactables[2].questState);
                }
            }

            ConfigurePlacementZones(save);
            ConfigureMonster(save);

            if (quarterViewCameraRig != null && playerTransform != null)
            {
                quarterViewCameraRig.Configure(
                    playerTransform,
                    new Vector3(
                        definition.cameraOffset.x,
                        definition.cameraOffset.y,
                        definition.cameraOffset.z));
            }

            if (DeepStakeGameState.Instance != null)
            {
                if (save != null)
                {
                    save.Player.MapId = definition.zoneId;
                    save.CurrentZoneId = definition.zoneId;
                    save.CurrentZoneLabel = definition.zoneLabel;
                    save.ActivePressureHint = definition.pressureHint;
                    save.LastStatus = "Entered " + definition.zoneLabel + ".";
                    DeepStakeGameState.Instance.UpdateStatus(
                        "Entered " + definition.zoneLabel + ".");
                }

                DeepStakeGameState.Instance.UpdatePrompt(
                    "Read the authority notice, speak with Archivist Sena, inspect the supply crates, then anchor the beacon.");
            }

            DeepStakePbrEnvironmentPipeline.ApplyToWorld(
                zoneRoot,
                interactableTransform,
                secondaryInteractableTransform,
                tertiaryInteractableTransform,
                placementMarkerTransform,
                secondaryPlacementMarkerTransform,
                placementPreviewRoot,
                secondaryPlacementPreviewRoot);

            Debug.Log("[DeepStakeDev] WorldPrototype3D ready. zone=" + definition.zoneId + " player=" + (playerTransform != null));
            DebugLogScreenshotSchedulingState();
            TryScheduleLocalScreenshotCapture();
        }

        private void Update()
        {
            DeepStakeInputBridge.PollHardware();
            RefreshPrompt();

            var interactPressed = DeepStakeInputBridge.ConsumeInteract();
            var talkPressed = DeepStakeInputBridge.ConsumeTalk();
            var placePressed = DeepStakeInputBridge.ConsumePlace();
            var attackPressed = DeepStakeInputBridge.ConsumeAttack();
            var savePressed = DeepStakeInputBridge.ConsumeSave();
            var reloadPressed = DeepStakeInputBridge.ConsumeReload();
            var journalPressed = DeepStakeInputBridge.ConsumeJournal();

            if (interactPressed)
            {
                var activeInteractable = GetActiveInteractable();
                if (activeInteractable != null && activeInteractable.CanInteract(playerTransform))
                {
                    activeInteractable.Trigger();
                    PlayPlayerAction(ArticulatedHumanoidAction.Inspect, activeInteractable.transform.position);
                    SetInputDebug("Interact fired from " + DeepStakeInputBridge.InputModeLabel + ".", activeInteractable.GetLabel());
                }
                else
                {
                    PublishBlockedAction("Move closer to inspect. " + GetNearestInteractableDistanceLabel(), GetNearbyLabel());
                }
            }

        if (talkPressed)
        {
            var activeTalkNpc = GetActiveTalkNpc();
            if (activeTalkNpc != null && activeTalkNpc.CanTalk(playerTransform))
            {
                activeTalkNpc.Talk();
                PlayPlayerAction(ArticulatedHumanoidAction.Talk, activeTalkNpc.transform.position);
                SetInputDebug("Talk fired from " + DeepStakeInputBridge.InputModeLabel + ".", activeTalkNpc.GetLabel());
            }
            else
            {
                PublishBlockedAction("Move closer to talk. " + GetNearestTalkNpcDistanceLabel(), GetNearbyLabel());
            }
        }

            if (placePressed)
            {
                var activePlacement = GetActivePlacement();
                if (activePlacement != null && activePlacement.CanPlace(playerTransform))
                {
                    activePlacement.Place();
                    PlayPlayerAction(ArticulatedHumanoidAction.Place, activePlacement.transform.position);
                    SetInputDebug("Place fired from " + DeepStakeInputBridge.InputModeLabel + ".", activePlacement.GetLabel());
                }
                else
                {
                    var nearestPlacement = GetNearestPlacement();
                    var blockedReason = nearestPlacement != null
                        ? nearestPlacement.GetBlockedReason() + " " + GetNearestPlacementDistanceLabel()
                        : "Placement unavailable.";
                    PublishBlockedAction(blockedReason, GetNearbyLabel());
                }
            }

            if (attackPressed)
            {
                if (monster != null && !monster.IsDefeated)
                {
                    PlayPlayerAction(ArticulatedHumanoidAction.Attack, monster.transform.position);
                    if (monster.CanBeHitFrom(playerTransform.position, 3.0f))
                    {
                        monster.ReceiveHit(playerTransform.position);
                        SetInputDebug("Attack hit from " + DeepStakeInputBridge.InputModeLabel + ".", "Husk");
                    }
                    else
                    {
                        PublishBlockedAction("Too far to hit.", GetNearbyLabel());
                        SetInputDebug("Attack missed from " + DeepStakeInputBridge.InputModeLabel + ".", "Husk");
                    }
                }
                else
                {
                    PlayPlayerAction(ArticulatedHumanoidAction.Attack, playerTransform.position + playerTransform.forward);
                    PublishBlockedAction("No target in reach.", GetNearbyLabel());
                }
            }

            if (savePressed && DeepStakeGameState.Instance != null)
            {
                LocalSaveService.Save(DeepStakeGameState.Instance.CurrentSave);
                DeepStakeGameState.Instance.UpdateStatus("Saved local slot.");
                SetInputDebug("Save fired from " + DeepStakeInputBridge.InputModeLabel + ".", GetNearbyLabel());
            }

            if (reloadPressed && DeepStakeGameState.Instance != null)
            {
                var loaded = LocalSaveService.LoadOrCreate();
                DeepStakeGameState.Instance.ReplaceSave(loaded, "Loaded latest local slot.");
                if (playerTransform != null && loaded.Player.MapId == definition.zoneId)
                {
                    playerTransform.position = new Vector3(loaded.Player.X, 0.5f, loaded.Player.Y);
                }

                ApplySavedPlacementState(loaded);
                if (monster != null)
                {
                    monster.ResetState(loaded.StoryFlags.DefeatedFirstMonster);
                }

                SetInputDebug("Load fired from " + DeepStakeInputBridge.InputModeLabel + ".", GetNearbyLabel());
            }

            if (journalPressed && DeepStakeGameState.Instance != null)
            {
                DeepStakeGameState.Instance.ToggleJournal();
                SetInputDebug("Journal toggled from " + DeepStakeInputBridge.InputModeLabel + ".", GetNearbyLabel());
            }

            TryRunLocalScreenshotFallback();
        }

        private void RefreshPrompt()
        {
            if (DeepStakeGameState.Instance == null)
            {
                return;
            }

            var nearbyLabel = GetNearbyLabel();
            var prompt = Application.isMobilePlatform || forceMobileControlsInEditor
                ? "Touch controls ready. Hold Run to sprint."
                : "WASD Move  Shift Run  E Inspect  Q Talk  B Place  F Attack";
            var activeInteractable = GetActiveInteractable();
            if (activeInteractable != null && activeInteractable.CanInteract(playerTransform))
            {
                prompt = activeInteractable.GetPrompt();
            }
        else if (questNpc != null && questNpc.CanTalk(playerTransform))
        {
            prompt = questNpc.GetPrompt();
        }
        else if (secondaryQuestNpc != null && secondaryQuestNpc.CanTalk(playerTransform))
        {
            prompt = secondaryQuestNpc.GetPrompt();
        }
            else if (GetNearestPlacement() != null && GetNearestPlacement().IsNear(playerTransform))
            {
                prompt = GetNearestPlacement().GetPrompt();
            }
            else if (monster != null && !monster.IsDefeated && monster.CanBeHitFrom(playerTransform.position, 3.0f))
            {
                prompt = Application.isMobilePlatform || forceMobileControlsInEditor ? "Tap Attack." : "F Attack  Hold the line.";
            }
            else if (Application.isMobilePlatform || forceMobileControlsInEditor)
            {
                prompt = "Touch controls ready.";
            }
            else if (nearbyLabel != "None")
            {
                prompt = "Move closer to " + nearbyLabel + ".";
            }

            if (prompt != lastPrompt)
            {
                lastPrompt = prompt;
                DeepStakeGameState.Instance.UpdatePrompt(prompt);
            }

            if (DeepStakeGameState.Instance.NearbyTargetLabel != nearbyLabel)
            {
                DeepStakeGameState.Instance.UpdateInputDebug(lastInputDebug, nearbyLabel);
            }

            if (lastInputDebug == string.Empty)
            {
                DeepStakeGameState.Instance.UpdateInputDebug(
                    "Input ready.",
                    nearbyLabel);
                lastInputDebug = "Input ready.";
            }
        }

        private void BuildZoneLandmarks()
        {
            if (zoneRoot == null)
            {
                return;
            }

            WorldPrototypeVisualPass.RebuildZoneVisuals(
                zoneRoot,
                definition,
                fieldMaterial,
                archiveMaterial,
                placementMaterial,
                roadMaterial,
                storageMaterial);

            if (placementPreviewRoot != null)
            {
                placementPreviewRoot.position = new Vector3(definition.placementZone.x, 0.5f, definition.placementZone.z);
            }
        }

        private void EnsureMobileControls()
        {
            if (!Application.isMobilePlatform && !forceMobileControlsInEditor)
            {
                return;
            }

            if (FindFirstObjectByType<MobileControlsOverlay>() != null)
            {
                return;
            }

            var canvas = FindFirstObjectByType<Canvas>();
            if (canvas == null)
            {
                var canvasObject = new GameObject("HudCanvas");
                canvas = canvasObject.AddComponent<Canvas>();
                canvas.renderMode = RenderMode.ScreenSpaceOverlay;
                canvasObject.AddComponent<CanvasScaler>();
                canvasObject.AddComponent<GraphicRaycaster>();
            }

            var overlayObject = new GameObject("MobileControlsOverlay");
            overlayObject.transform.SetParent(canvas.transform, false);
            overlayObject.transform.SetAsLastSibling();
            var overlay = overlayObject.AddComponent<MobileControlsOverlay>();
            overlay.Configure(canvas, forceMobileControlsInEditor);
            overlay.Build();
        }

        private void EnsureGuidanceOverlay()
        {
            if (FindFirstObjectByType<GuidanceOverlayView>() != null)
            {
                return;
            }

            var canvas = FindFirstObjectByType<Canvas>();
            if (canvas == null)
            {
                var canvasObject = new GameObject("HudCanvas");
                canvas = canvasObject.AddComponent<Canvas>();
                canvas.renderMode = RenderMode.ScreenSpaceOverlay;
                canvasObject.AddComponent<CanvasScaler>();
                canvasObject.AddComponent<GraphicRaycaster>();
            }

            var overlayObject = new GameObject("GuidanceOverlay");
            overlayObject.transform.SetParent(canvas.transform, false);
            overlayObject.transform.SetAsLastSibling();
            var overlay = overlayObject.AddComponent<GuidanceOverlayView>();
            overlay.Configure(canvas);
        }

        private void HideLegacyHudStatus()
        {
            var legacyHud = FindFirstObjectByType<HudStatusView>();
            if (legacyHud != null)
            {
                legacyHud.gameObject.SetActive(false);
            }
        }

        private void ResolveSceneReferences()
        {
            if (playerTransform == null)
            {
                var locatedPlayerMover = FindFirstObjectByType<PlayerMover3D>();
                if (locatedPlayerMover != null)
                {
                    playerMover = locatedPlayerMover;
                    playerTransform = locatedPlayerMover.transform;
                }
            }
            else if (playerMover == null)
            {
                playerMover = playerTransform.GetComponent<PlayerMover3D>();
            }

            if (primaryInteractable == null)
            {
                primaryInteractable = FindFirstObjectByType<Interactable3DStub>();
            }

            if (primaryInteractable != null && interactableTransform == null)
            {
                interactableTransform = primaryInteractable.transform;
            }

            if (secondaryInteractable == null)
            {
                var allInteractables = FindObjectsByType<Interactable3DStub>(FindObjectsSortMode.None);
                for (var index = 0; index < allInteractables.Length; index++)
                {
                    if (allInteractables[index] != primaryInteractable)
                    {
                        secondaryInteractable = allInteractables[index];
                        break;
                    }
                }
            }

        if (secondaryInteractable != null && secondaryInteractableTransform == null)
        {
            secondaryInteractableTransform = secondaryInteractable.transform;
        }

            if (tertiaryInteractable == null)
            {
                var allInteractables = FindObjectsByType<Interactable3DStub>(FindObjectsSortMode.None);
                for (var index = 0; index < allInteractables.Length; index++)
                {
                    if (allInteractables[index] != primaryInteractable && allInteractables[index] != secondaryInteractable)
                    {
                        tertiaryInteractable = allInteractables[index];
                        break;
                    }
                }
            }

            if (tertiaryInteractable != null && tertiaryInteractableTransform == null)
            {
                tertiaryInteractableTransform = tertiaryInteractable.transform;
            }

            if (questNpc == null)
            {
                questNpc = FindFirstObjectByType<QuestNpc3DStub>();
            }

            if (questNpc != null && npcTransform == null)
            {
                npcTransform = questNpc.transform;
            }

            if (settlementPlacement == null)
            {
                settlementPlacement = FindFirstObjectByType<SettlementPlacement3DStub>();
            }

            if (settlementPlacement != null && placementMarkerTransform == null)
            {
                placementMarkerTransform = settlementPlacement.transform;
            }

            if (secondarySettlementPlacement == null)
            {
                var allPlacements = FindObjectsByType<SettlementPlacement3DStub>(FindObjectsSortMode.None);
                for (var index = 0; index < allPlacements.Length; index++)
                {
                    if (allPlacements[index] != settlementPlacement)
                    {
                        secondarySettlementPlacement = allPlacements[index];
                        break;
                    }
                }
            }

            if (secondarySettlementPlacement != null && secondaryPlacementMarkerTransform == null)
            {
                secondaryPlacementMarkerTransform = secondarySettlementPlacement.transform;
            }

            if (placementPreviewRoot == null)
            {
                var preview = GameObject.Find("PlacedBeacon3D");
                if (preview != null)
                {
                    placementPreviewRoot = preview.transform;
                }
            }

        if (quarterViewCameraRig == null)
        {
            quarterViewCameraRig = FindFirstObjectByType<QuarterViewCameraRig>();
        }

        if (questNpc == null || secondaryQuestNpc == null)
        {
            var allNpcs = FindObjectsByType<QuestNpc3DStub>(FindObjectsSortMode.None);
            for (var index = 0; index < allNpcs.Length; index++)
            {
                if (questNpc == null)
                {
                    questNpc = allNpcs[index];
                    npcTransform = allNpcs[index].transform;
                    continue;
                }

                if (allNpcs[index] != questNpc && secondaryQuestNpc == null)
                {
                    secondaryQuestNpc = allNpcs[index];
                    secondaryNpcTransform = allNpcs[index].transform;
                    break;
                }
            }
        }

        if (zoneRoot == null)
        {
                var existingRoot = GameObject.Find("ZoneRoot");
                if (existingRoot != null)
                {
                    zoneRoot = existingRoot.transform;
                }
                else
                {
                    var zoneObject = new GameObject("ZoneRoot");
                    zoneRoot = zoneObject.transform;
                }
            }
        }

        private void EnsureInteractiveSceneObjects()
        {
            if (primaryInteractable == null)
            {
                var signObject = GameObject.Find("OutpostNotice3D") ?? GameObject.Find("FarmSign3D");
                if (signObject != null)
                {
                    primaryInteractable = signObject.GetComponent<Interactable3DStub>();
                    if (primaryInteractable == null)
                    {
                        primaryInteractable = signObject.AddComponent<Interactable3DStub>();
                    }
                    interactableTransform = signObject.transform;
                    WorldPrototypeVisualPass.EnsureWorldPropVisual(interactableTransform, "farm-sign");
                }
            }

            if (secondaryInteractable == null)
            {
                var supplyObject = GameObject.Find("SupplyCache3D");
                if (supplyObject == null)
                {
                    supplyObject = GameObject.CreatePrimitive(PrimitiveType.Cube);
                    supplyObject.name = "SupplyCache3D";
                    supplyObject.transform.position = new Vector3(-4.8f, 0.75f, -1.2f);
                    supplyObject.transform.localScale = new Vector3(1.4f, 1.0f, 1.4f);
                    if (zoneRoot != null)
                    {
                        supplyObject.transform.SetParent(zoneRoot, true);
                    }
                }

                secondaryInteractable = supplyObject.GetComponent<Interactable3DStub>();
                if (secondaryInteractable == null)
                {
                    secondaryInteractable = supplyObject.AddComponent<Interactable3DStub>();
                }
                secondaryInteractableTransform = supplyObject.transform;
                WorldPrototypeVisualPass.EnsureWorldPropVisual(secondaryInteractableTransform, "supply-cache");
            }

            if (tertiaryInteractable == null)
            {
                var observerObject = GameObject.Find("ObserverRecord3D");
                if (observerObject == null)
                {
                    observerObject = GameObject.CreatePrimitive(PrimitiveType.Cube);
                    observerObject.name = "ObserverRecord3D";
                    observerObject.transform.position = new Vector3(3.7f, 0.8f, 1.3f);
                    observerObject.transform.localScale = new Vector3(1.0f, 1.2f, 0.8f);
                    if (zoneRoot != null)
                    {
                        observerObject.transform.SetParent(zoneRoot, true);
                    }
                }

                tertiaryInteractable = observerObject.GetComponent<Interactable3DStub>();
                if (tertiaryInteractable == null)
                {
                    tertiaryInteractable = observerObject.AddComponent<Interactable3DStub>();
                }
                tertiaryInteractableTransform = observerObject.transform;
                WorldPrototypeVisualPass.EnsureWorldPropVisual(tertiaryInteractableTransform, "observer-record");
            }

            if (questNpc == null)
            {
                var npcObject = GameObject.Find("Archivist3D");
                if (npcObject != null)
                {
                    questNpc = npcObject.GetComponent<QuestNpc3DStub>();
                    if (questNpc == null)
                    {
                        questNpc = npcObject.AddComponent<QuestNpc3DStub>();
                    }
                    npcTransform = npcObject.transform;
                }
            }

            if (secondaryQuestNpc == null)
            {
                var workerObject = GameObject.Find("FieldHand3D");
                if (workerObject == null)
                {
                    workerObject = new GameObject("FieldHand3D");
                    workerObject.transform.position = new Vector3(-2.7f, 0.5f, -0.9f);
                    if (zoneRoot != null)
                    {
                        workerObject.transform.SetParent(zoneRoot, true);
                    }
                }

                secondaryQuestNpc = workerObject.GetComponent<QuestNpc3DStub>();
                if (secondaryQuestNpc == null)
                {
                    secondaryQuestNpc = workerObject.AddComponent<QuestNpc3DStub>();
                }
                secondaryNpcTransform = workerObject.transform;
            }

            if (monster == null)
            {
                var monsterObject = GameObject.Find("FirstHusk3D");
                if (monsterObject == null)
                {
                    monsterObject = new GameObject("FirstHusk3D");
                    monsterObject.transform.position = new Vector3(10.8f, 0.5f, -7.2f);
                    if (zoneRoot != null)
                    {
                        monsterObject.transform.SetParent(zoneRoot, true);
                    }

                    var controller = monsterObject.AddComponent<CharacterController>();
                    controller.center = new Vector3(0f, 0.85f, 0f);
                    controller.height = 1.7f;
                    controller.radius = 0.35f;
                }

                monster = monsterObject.GetComponent<Monster3DStub>();
                if (monster == null)
                {
                    monster = monsterObject.AddComponent<Monster3DStub>();
                }

                monsterTransform = monsterObject.transform;
            }

            if (settlementPlacement == null)
            {
                var placementObject = GameObject.Find("PlacementMarker3D");
                if (placementObject != null)
                {
                    settlementPlacement = placementObject.GetComponent<SettlementPlacement3DStub>();
                    if (settlementPlacement == null)
                    {
                        settlementPlacement = placementObject.AddComponent<SettlementPlacement3DStub>();
                    }
                    placementMarkerTransform = placementObject.transform;
                    WorldPrototypeVisualPass.EnsureWorldPropVisual(placementMarkerTransform, "recovery-beacon");
                }
            }

            if (placementPreviewRoot == null)
            {
                var preview = GameObject.Find("PlacedBeacon3D");
                if (preview != null)
                {
                    placementPreviewRoot = preview.transform;
                    WorldPrototypeVisualPass.EnsureWorldPropVisual(placementPreviewRoot, "recovery-beacon");
                }
            }

            if (secondarySettlementPlacement == null)
            {
                var placementObject = GameObject.Find("SupplyRelayMarker3D");
                if (placementObject == null)
                {
                    placementObject = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
                    placementObject.name = "SupplyRelayMarker3D";
                    placementObject.transform.position = new Vector3(-1.2f, 0.05f, -2.8f);
                    placementObject.transform.localScale = new Vector3(1.0f, 0.05f, 1.0f);
                    if (zoneRoot != null)
                    {
                        placementObject.transform.SetParent(zoneRoot, true);
                    }
                }

                secondarySettlementPlacement = placementObject.GetComponent<SettlementPlacement3DStub>();
                if (secondarySettlementPlacement == null)
                {
                    secondarySettlementPlacement = placementObject.AddComponent<SettlementPlacement3DStub>();
                }
                secondaryPlacementMarkerTransform = placementObject.transform;
                WorldPrototypeVisualPass.EnsureWorldPropVisual(secondaryPlacementMarkerTransform, "supply-relay");
            }

            if (secondaryPlacementPreviewRoot == null)
            {
                var preview = GameObject.Find("PlacedSupplyRelay3D");
                if (preview == null)
                {
                    var previewObject = GameObject.CreatePrimitive(PrimitiveType.Cube);
                    previewObject.name = "PlacedSupplyRelay3D";
                    previewObject.transform.position = new Vector3(-1.2f, 0.55f, -2.8f);
                    previewObject.transform.localScale = new Vector3(0.8f, 1.0f, 0.8f);
                    previewObject.SetActive(false);
                    if (zoneRoot != null)
                    {
                        previewObject.transform.SetParent(zoneRoot, true);
                    }
                    preview = previewObject;
                }
                secondaryPlacementPreviewRoot = preview.transform;
                WorldPrototypeVisualPass.EnsureWorldPropVisual(secondaryPlacementPreviewRoot, "supply-relay");
            }

            if (interactableTransform != null)
            {
                WorldPrototypeVisualPass.EnsureWorldPropVisual(interactableTransform, "farm-sign");
            }

            if (secondaryInteractableTransform != null)
            {
                WorldPrototypeVisualPass.EnsureWorldPropVisual(secondaryInteractableTransform, "supply-cache");
            }

            if (tertiaryInteractableTransform != null)
            {
                WorldPrototypeVisualPass.EnsureWorldPropVisual(tertiaryInteractableTransform, "observer-record");
            }

            if (placementMarkerTransform != null)
            {
                WorldPrototypeVisualPass.EnsureWorldPropVisual(placementMarkerTransform, "recovery-beacon");
            }

            if (secondaryPlacementMarkerTransform != null)
            {
                WorldPrototypeVisualPass.EnsureWorldPropVisual(secondaryPlacementMarkerTransform, "supply-relay");
            }

            if (placementPreviewRoot != null)
            {
                WorldPrototypeVisualPass.EnsureWorldPropVisual(placementPreviewRoot, "recovery-beacon");
            }

            if (secondaryPlacementPreviewRoot != null)
            {
                WorldPrototypeVisualPass.EnsureWorldPropVisual(secondaryPlacementPreviewRoot, "supply-relay");
            }

            if (npcTransform != null)
            {
                WorldPrototypeVisualPass.EnsureArchivistProxy(npcTransform);
                var archivistView = npcTransform.GetComponent<ArticulatedHumanoidView>();
                if (archivistView != null)
                {
                    archivistView.ForceIdleMotion();
                }
            }

            if (secondaryNpcTransform != null)
            {
                var fieldHandView = secondaryNpcTransform.GetComponent<ArticulatedHumanoidView>();
                if (fieldHandView == null)
                {
                    fieldHandView = secondaryNpcTransform.gameObject.AddComponent<ArticulatedHumanoidView>();
                }
                fieldHandView.Configure(ArticulatedHumanoidRole.FieldWorker);
                fieldHandView.ForceIdleMotion();
            }
        }

        private void ConfigureMonster(DeepStake.Contracts.DeepStakeSaveData save)
        {
            if (monster == null)
            {
                return;
            }

            if (monsterTransform != null && playerTransform != null && !(save != null && save.StoryFlags.DefeatedFirstMonster))
            {
                monsterTransform.position = new Vector3(10.8f, 0.5f, -7.2f);
                var playerFlat = new Vector3(playerTransform.position.x, 0f, playerTransform.position.z);
                var monsterFlat = new Vector3(monsterTransform.position.x, 0f, monsterTransform.position.z);
                if (Vector3.Distance(playerFlat, monsterFlat) < 6.25f)
                {
                    monsterTransform.position = new Vector3(12.2f, 0.5f, -8.4f);
                }
            }

            monster.Configure(playerTransform, playerTransform != null ? playerTransform.GetComponent<ArticulatedHumanoidView>() : null);
            monster.ResetState(save != null && save.StoryFlags.DefeatedFirstMonster);
        }

        private string GetNearbyLabel()
        {
            var activeInteractable = GetActiveInteractable();
        if (activeInteractable != null && activeInteractable.CanInteract(playerTransform))
        {
            return activeInteractable.GetLabel();
        }

        var activeTalkNpc = GetActiveTalkNpc();
        if (activeTalkNpc != null && activeTalkNpc.CanTalk(playerTransform))
        {
            return activeTalkNpc.GetLabel();
        }

            var activePlacement = GetActivePlacement();
            if (activePlacement != null && activePlacement.CanPlace(playerTransform))
            {
                return activePlacement.GetLabel();
            }

            if (monster != null && !monster.IsDefeated)
            {
                var monsterDistance = Vector3.Distance(
                    new Vector3(playerTransform.position.x, 0f, playerTransform.position.z),
                    new Vector3(monster.transform.position.x, 0f, monster.transform.position.z));
                if (monsterDistance <= AwarenessRange)
                {
                    return "Husk (" + monsterDistance.ToString("0.0") + "m)";
                }
            }

            var interactDistance = GetNearestInteractableDistance();
            var talkDistance = GetNearestTalkNpcDistance();
            var placeDistance = GetNearestPlacementDistance();
            var monsterNearestDistance = GetMonsterDistance();
            var nearestDistance = Mathf.Min(interactDistance, talkDistance, placeDistance, monsterNearestDistance);

            if (nearestDistance > AwarenessRange)
            {
                return "None";
            }

            if (nearestDistance == interactDistance && GetNearestInteractable() != null)
            {
                return GetNearestInteractable().GetLabel() + " (" + interactDistance.ToString("0.0") + "m)";
            }

        var nearestTalkNpc = GetNearestTalkNpc();
        if (nearestDistance == talkDistance && nearestTalkNpc != null)
        {
            return nearestTalkNpc.GetLabel() + " (" + talkDistance.ToString("0.0") + "m)";
        }

            if (nearestDistance == placeDistance && GetNearestPlacement() != null)
            {
                return GetNearestPlacement().GetLabel() + " (" + placeDistance.ToString("0.0") + "m)";
            }

            if (nearestDistance == monsterNearestDistance && monster != null && !monster.IsDefeated)
            {
                return "Husk (" + monsterNearestDistance.ToString("0.0") + "m)";
            }

            return "None";
        }

        private float GetMonsterDistance()
        {
            if (monster == null || monster.IsDefeated || playerTransform == null)
            {
                return float.MaxValue;
            }

            return Vector3.Distance(
                new Vector3(playerTransform.position.x, 0f, playerTransform.position.z),
                new Vector3(monster.transform.position.x, 0f, monster.transform.position.z));
        }

        private string GetDistanceLabel(Interactable3DStub interactable)
        {
            if (interactable == null)
            {
                return "n/a";
            }

            return interactable.GetDistance(playerTransform).ToString("0.0") + "m";
        }

        private string GetNearestInteractableDistanceLabel()
        {
            var interactable = GetNearestInteractable();
            return GetDistanceLabel(interactable);
        }

        private Interactable3DStub GetActiveInteractable()
        {
            var interactable = GetNearestInteractable();
            if (interactable == null)
            {
                return null;
            }

            return interactable.CanInteract(playerTransform) ? interactable : null;
        }

        private Interactable3DStub GetNearestInteractable()
        {
            var primaryDistance = primaryInteractable != null ? primaryInteractable.GetDistance(playerTransform) : float.MaxValue;
            var secondaryDistance = secondaryInteractable != null ? secondaryInteractable.GetDistance(playerTransform) : float.MaxValue;
            var tertiaryDistance = tertiaryInteractable != null ? tertiaryInteractable.GetDistance(playerTransform) : float.MaxValue;

            if (primaryDistance <= secondaryDistance && primaryDistance <= tertiaryDistance)
            {
                return primaryInteractable;
            }

            if (secondaryDistance <= tertiaryDistance)
            {
                return secondaryInteractable;
            }

            return tertiaryInteractable;
        }

    private float GetNearestInteractableDistance()
    {
        var interactable = GetNearestInteractable();
        return interactable != null ? interactable.GetDistance(playerTransform) : float.MaxValue;
    }

    private QuestNpc3DStub GetActiveTalkNpc()
    {
        var npc = GetNearestTalkNpc();
        if (npc == null)
        {
            return null;
        }

        return npc.CanTalk(playerTransform) ? npc : null;
    }

    private QuestNpc3DStub GetNearestTalkNpc()
    {
        var primaryDistance = questNpc != null ? questNpc.GetDistance(playerTransform) : float.MaxValue;
        var secondaryDistance = secondaryQuestNpc != null ? secondaryQuestNpc.GetDistance(playerTransform) : float.MaxValue;

        if (primaryDistance <= secondaryDistance)
        {
            return questNpc;
        }

        return secondaryQuestNpc;
    }

    private float GetNearestTalkNpcDistance()
    {
        var npc = GetNearestTalkNpc();
        return npc != null ? npc.GetDistance(playerTransform) : float.MaxValue;
    }

    private string GetDistanceLabel(QuestNpc3DStub npc)
    {
        if (npc == null)
        {
            return "n/a";
        }

        return npc.GetDistance(playerTransform).ToString("0.0") + "m";
    }

    private string GetNearestTalkNpcDistanceLabel()
    {
        return GetDistanceLabel(GetNearestTalkNpc());
    }

        private string GetDistanceLabel(SettlementPlacement3DStub placement)
        {
            if (placement == null)
            {
                return "n/a";
            }

            return placement.GetDistance(playerTransform).ToString("0.0") + "m";
        }

        private string GetNearestPlacementDistanceLabel()
        {
            return GetDistanceLabel(GetNearestPlacement());
        }

        private SettlementPlacement3DStub GetActivePlacement()
        {
            var placement = GetNearestPlacement();
            if (placement == null)
            {
                return null;
            }

            return placement;
        }

        private SettlementPlacement3DStub GetNearestPlacement()
        {
            var primaryDistance = settlementPlacement != null ? settlementPlacement.GetDistance(playerTransform) : float.MaxValue;
            var secondaryDistance = secondarySettlementPlacement != null ? secondarySettlementPlacement.GetDistance(playerTransform) : float.MaxValue;

            if (primaryDistance <= secondaryDistance)
            {
                return settlementPlacement;
            }

            return secondarySettlementPlacement;
        }

        private float GetNearestPlacementDistance()
        {
            var placement = GetNearestPlacement();
            return placement != null ? placement.GetDistance(playerTransform) : float.MaxValue;
        }

        private void ConfigurePlacementZones(DeepStake.Contracts.DeepStakeSaveData save)
        {
            if (definition.placementZones == null || definition.placementZones.Length == 0)
            {
                return;
            }

            ConfigurePlacementZone(
                definition.placementZones[0],
                placementMarkerTransform,
                placementPreviewRoot,
                settlementPlacement,
                save);

            if (definition.placementZones.Length > 1)
            {
                ConfigurePlacementZone(
                    definition.placementZones[1],
                    secondaryPlacementMarkerTransform,
                    secondaryPlacementPreviewRoot,
                    secondarySettlementPlacement,
                    save);
            }
        }

        private void ConfigurePlacementZone(
            WorldPrototype3DPlacementZone zone,
            Transform markerTransform,
            Transform previewRoot,
            SettlementPlacement3DStub placement,
            DeepStake.Contracts.DeepStakeSaveData save)
        {
            if (zone == null)
            {
                return;
            }

            var position = new Vector3(zone.x, 0.5f, zone.z);
            if (markerTransform != null)
            {
                markerTransform.position = position;
            }

            if (previewRoot != null)
            {
                previewRoot.position = position;
            }

            if (placement != null)
            {
                placement.Configure(
                    zone.objectType,
                    zone.label,
                    zone.promptLabel,
                    position,
                    zone.requiredFlag,
                    zone.restoredStructureId,
                    zone.unlockMessage);
            }

            if (save == null || placement == null)
            {
                return;
            }

            for (var index = 0; index < save.Settlement.Objects.Count; index++)
            {
                if (save.Settlement.Objects[index].Type == zone.objectType)
                {
                    placement.ApplyPlacedState();
                    break;
                }
            }
        }

        private void ApplySavedPlacementState(DeepStake.Contracts.DeepStakeSaveData save)
        {
            if (save == null)
            {
                return;
            }

            if (settlementPlacement != null)
            {
                for (var index = 0; index < save.Settlement.Objects.Count; index++)
                {
                    if (save.Settlement.Objects[index].Type == "recovery-beacon" || save.Settlement.Objects[index].Type == "beacon")
                    {
                        settlementPlacement.ApplyPlacedState();
                        break;
                    }
                }
            }

            if (secondarySettlementPlacement != null)
            {
                for (var index = 0; index < save.Settlement.Objects.Count; index++)
                {
                    if (save.Settlement.Objects[index].Type == "supply-relay")
                    {
                        secondarySettlementPlacement.ApplyPlacedState();
                        break;
                    }
                }
            }
        }

        private void PublishBlockedAction(string reason, string nearbyLabel)
        {
            if (DeepStakeGameState.Instance == null)
            {
                return;
            }

            DeepStakeGameState.Instance.UpdateStatus(reason);
            SetInputDebug(reason, nearbyLabel);
        }

        private void SetInputDebug(string message, string nearbyLabel)
        {
            lastInputDebug = message;
            if (DeepStakeGameState.Instance == null)
            {
                return;
            }

            DeepStakeGameState.Instance.UpdateInputDebug(message, nearbyLabel);
        }

        private void PlayPlayerAction(ArticulatedHumanoidAction action, Vector3 worldTarget)
        {
            if (playerMover == null && playerTransform != null)
            {
                playerMover = playerTransform.GetComponent<PlayerMover3D>();
            }

            if (playerMover != null)
            {
                playerMover.PlayAction(action, worldTarget);
            }
        }

        private void TryScheduleLocalScreenshotCapture()
        {
            Debug.Log("[DeepStakeDev] TryScheduleLocalScreenshotCapture entered.");
            var request = TryReadScreenshotRequest();
            pendingScreenshotRequest = request;
            var shouldCapture = DeepStakeDevLaunchOptions.CaptureLocalScreenshot || request != null;
            var uiCanvasCount = FindObjectsByType<Canvas>(FindObjectsInactive.Exclude, FindObjectsSortMode.None).Length;
            var selectedCamera = ResolveGameplayCamera();

            Debug.Log(
                "[DeepStakeDev] Screenshot scheduling method entered. localScreenshotScheduled=" + localScreenshotScheduled +
                " captureLocalScreenshot=" + DeepStakeDevLaunchOptions.CaptureLocalScreenshot +
                " cleanSceneCapture=" + DeepStakeDevLaunchOptions.CleanSceneCapture +
                " requestedPath=" + DeepStakeDevLaunchOptions.ScreenshotDirectory +
                " selectedCamera=" + (selectedCamera != null ? selectedCamera.name : "null") +
                " automationRequestFound=" + (request != null) +
                " uiCanvasCount=" + uiCanvasCount);

            Debug.Log(
                "[DeepStakeDev] Screenshot scheduling check. captureLocalScreenshot=" + DeepStakeDevLaunchOptions.CaptureLocalScreenshot +
                " cleanSceneCapture=" + DeepStakeDevLaunchOptions.CleanSceneCapture +
                " requestedPath=" + DeepStakeDevLaunchOptions.ScreenshotDirectory +
                " automationRequestFound=" + (request != null) +
                " uiCanvasCount=" + uiCanvasCount);

            if (!shouldCapture)
            {
                return;
            }

            if (localScreenshotScheduled)
            {
                Debug.LogWarning("[DeepStakeDev] Local screenshot was already scheduled. Skipping duplicate StartCoroutine.");
                return;
            }

            localScreenshotScheduled = true;
            localScreenshotCoroutineEntered = false;
            localScreenshotFallbackExecuted = false;
            localScreenshotScheduleRealtime = Time.realtimeSinceStartup;

            Debug.Log("[DeepStakeDev] About to StartCoroutine for local screenshot capture.");
            var coroutine = StartCoroutine(CaptureLocalScreenshotAfterFrameDelay(request));
            Debug.Log("[DeepStakeDev] StartCoroutine returned. coroutineNull=" + (coroutine == null));
        }

        private IEnumerator CaptureLocalScreenshotAfterFrameDelay(ScreenshotAutomationRequest request)
        {
            localScreenshotCoroutineEntered = true;
            Debug.Log("[DeepStakeDev] Capture coroutine entered.");

            Debug.Log("[DeepStakeDev] Capture coroutine before first yield.");
            yield return null;
            Debug.Log("[DeepStakeDev] Capture coroutine after first yield, before WaitForEndOfFrame.");
            yield return new WaitForEndOfFrame();
            Debug.Log("[DeepStakeDev] Capture coroutine after WaitForEndOfFrame.");
            yield return new WaitForSeconds(0.4f);
            Debug.Log("[DeepStakeDev] Capture coroutine after WaitForSeconds.");

            var screenshotPath = ResolveLocalScreenshotPath(request);
            if (string.IsNullOrWhiteSpace(screenshotPath))
            {
                Debug.LogWarning("[DeepStakeDev] Local screenshot capture skipped because no valid output path was resolved.");
                WriteScreenshotStatus("skipped", screenshotPath, false, false, "no_valid_output_path");
                yield break;
            }

            var shouldQuitAfterScreenshot = false;
            try
            {
                shouldQuitAfterScreenshot = ExecuteLocalScreenshotCapture(request, screenshotPath);
            }
            catch (System.Exception exception)
            {
                Debug.LogError("[DeepStakeDev] Capture coroutine failed: " + exception);
                WriteScreenshotStatus("failed", request != null ? request.screenshotPath : DeepStakeDevLaunchOptions.ScreenshotDirectory, request != null ? request.cleanSceneCapture : DeepStakeDevLaunchOptions.CleanSceneCapture, request != null ? request.hideUi : DeepStakeDevLaunchOptions.CleanSceneCapture, exception.ToString());
                yield break;
            }

            if (shouldQuitAfterScreenshot)
            {
                yield return new WaitForSeconds(1.1f);
                Debug.Log("[DeepStakeDev] Quitting after screenshot capture.");
                Application.Quit();
            }
        }

        private bool ExecuteLocalScreenshotCapture(ScreenshotAutomationRequest request, string screenshotPath)
        {
            var screenshotDirectory = Path.GetDirectoryName(screenshotPath);
            if (!string.IsNullOrWhiteSpace(screenshotDirectory))
            {
                Directory.CreateDirectory(screenshotDirectory);
            }

            var cleanSceneCapture = request != null ? request.cleanSceneCapture : DeepStakeDevLaunchOptions.CleanSceneCapture;
            var hideUi = request != null ? request.hideUi : cleanSceneCapture;
            Debug.Log("[DeepStakeDev] Capture coroutine before UI hide. cleanSceneCapture=" + cleanSceneCapture + " hideUi=" + hideUi);
            var canvasStates = hideUi ? SetAllCanvasesEnabled(false) : null;
            Debug.Log("[DeepStakeDev] Capture coroutine after UI hide. hiddenCanvasCount=" + (canvasStates != null ? canvasStates.Count : 0));

            try
            {
                Debug.Log(
                    "[DeepStakeDev] Local screenshot capture starting. path=" + screenshotPath +
                    " cleanSceneCapture=" + cleanSceneCapture +
                    " hideUi=" + hideUi +
                    " uiCanvasCount=" + (canvasStates != null ? canvasStates.Count : FindObjectsByType<Canvas>(FindObjectsInactive.Exclude, FindObjectsSortMode.None).Length));

                if (cleanSceneCapture)
                {
                    Debug.Log("[DeepStakeDev] Capture coroutine before camera/render capture.");
                    CaptureCameraToPng(screenshotPath);
                    Debug.Log("[DeepStakeDev] Clean local screenshot capture saved: " + screenshotPath);
                }
                else
                {
                    ScreenCapture.CaptureScreenshot(screenshotPath, 1);
                    Debug.Log("[DeepStakeDev] Local screenshot capture queued: " + screenshotPath);
                }
            }
            finally
            {
                RestoreCanvasStates(canvasStates);
                Debug.Log("[DeepStakeDev] Capture coroutine after UI restore.");
            }

            WriteScreenshotStatus("captured", screenshotPath, cleanSceneCapture, hideUi, "ok");
            Debug.Log("[DeepStakeDev] Capture coroutine after status JSON write.");
            DeleteScreenshotRequestFile();
            return DeepStakeDevLaunchOptions.QuitAfterScreenshot;
        }

        private void TryRunLocalScreenshotFallback()
        {
            if (!localScreenshotScheduled || localScreenshotCoroutineEntered || localScreenshotFallbackExecuted)
            {
                return;
            }

            if (Time.realtimeSinceStartup - localScreenshotScheduleRealtime < 2f)
            {
                return;
            }

            localScreenshotFallbackExecuted = true;
            Debug.Log("[DeepStakeDev] Coroutine entry log was not seen within 2 seconds. Running direct fallback capture.");

            try
            {
                RunDirectLocalScreenshotFallback(pendingScreenshotRequest);
            }
            catch (System.Exception exception)
            {
                Debug.LogError("[DeepStakeDev] Direct screenshot fallback failed: " + exception);
                WriteScreenshotStatus("failed", pendingScreenshotRequest != null ? pendingScreenshotRequest.screenshotPath : DeepStakeDevLaunchOptions.ScreenshotDirectory, pendingScreenshotRequest != null ? pendingScreenshotRequest.cleanSceneCapture : DeepStakeDevLaunchOptions.CleanSceneCapture, pendingScreenshotRequest != null ? pendingScreenshotRequest.hideUi : DeepStakeDevLaunchOptions.CleanSceneCapture, exception.ToString());
            }
        }

        private void RunDirectLocalScreenshotFallback(ScreenshotAutomationRequest request)
        {
            var screenshotPath = ResolveLocalScreenshotPath(request);
            var cleanSceneCapture = request != null ? request.cleanSceneCapture : DeepStakeDevLaunchOptions.CleanSceneCapture;
            var hideUi = request != null ? request.hideUi : cleanSceneCapture;

            Debug.Log(
                "[DeepStakeDev] Direct fallback entered. path=" + screenshotPath +
                " cleanSceneCapture=" + cleanSceneCapture +
                " hideUi=" + hideUi +
                " gameObjectActive=" + gameObject.activeInHierarchy +
                " controllerEnabled=" + isActiveAndEnabled);

            if (string.IsNullOrWhiteSpace(screenshotPath))
            {
                throw new System.InvalidOperationException("Direct fallback has no valid screenshot path.");
            }

            var screenshotDirectory = Path.GetDirectoryName(screenshotPath);
            if (!string.IsNullOrWhiteSpace(screenshotDirectory))
            {
                Directory.CreateDirectory(screenshotDirectory);
            }

            var canvasStates = hideUi ? SetAllCanvasesEnabled(false) : null;
            Debug.Log("[DeepStakeDev] Direct fallback after UI hide. hiddenCanvasCount=" + (canvasStates != null ? canvasStates.Count : 0));
            try
            {
                Debug.Log("[DeepStakeDev] Direct fallback before camera/render capture.");
                CaptureCameraToPng(screenshotPath);
                Debug.Log("[DeepStakeDev] Direct fallback after PNG write.");
            }
            finally
            {
                RestoreCanvasStates(canvasStates);
                Debug.Log("[DeepStakeDev] Direct fallback after UI restore.");
            }

            WriteScreenshotStatus("captured", screenshotPath, cleanSceneCapture, hideUi, "fallback_ok");
            Debug.Log("[DeepStakeDev] Direct fallback after status JSON write.");
            DeleteScreenshotRequestFile();
        }

        private string ResolveLocalScreenshotPath(ScreenshotAutomationRequest request)
        {
            var outputRoot = request != null && !string.IsNullOrWhiteSpace(request.screenshotPath)
                ? request.screenshotPath
                : DeepStakeDevLaunchOptions.ScreenshotDirectory;
            if (string.IsNullOrWhiteSpace(outputRoot))
            {
                outputRoot = ResolveDefaultScreenshotDirectory();
            }

            if (string.IsNullOrWhiteSpace(outputRoot))
            {
                return string.Empty;
            }

            var treatAsFilePath = outputRoot.EndsWith(".png", System.StringComparison.OrdinalIgnoreCase);
            if (!Path.IsPathRooted(outputRoot))
            {
                outputRoot = Path.GetFullPath(Path.Combine(ResolveProjectRootOrFallback(), outputRoot));
            }

            if (treatAsFilePath)
            {
                return outputRoot;
            }

            var timestamp = System.DateTime.Now.ToString("yyyyMMdd-HHmmss");
            var verificationTag = DeepStakeDevLaunchOptions.VerificationTag;
            if (string.IsNullOrWhiteSpace(verificationTag))
            {
                verificationTag = Application.isEditor ? "editor" : "runtime";
            }

            verificationTag = SanitizeFileNameFragment(verificationTag);
            return Path.Combine(outputRoot, "local-" + verificationTag + "-" + timestamp + ".png");
        }

        private void DebugLogScreenshotSchedulingState()
        {
            var request = TryReadScreenshotRequest();
            var uiCanvasCount = FindObjectsByType<Canvas>(FindObjectsInactive.Exclude, FindObjectsSortMode.None).Length;
            Debug.Log(
                "[DeepStakeDev] Pre-screenshot state. captureLocalScreenshot=" + DeepStakeDevLaunchOptions.CaptureLocalScreenshot +
                " cleanSceneCapture=" + DeepStakeDevLaunchOptions.CleanSceneCapture +
                " requestedPath=" + DeepStakeDevLaunchOptions.ScreenshotDirectory +
                " automationRequestFound=" + (request != null) +
                " automationRequestPath=" + (request != null ? request.screenshotPath : string.Empty) +
                " uiCanvasCount=" + uiCanvasCount);
        }

        private static string ResolveDefaultScreenshotDirectory()
        {
            if (Application.isEditor)
            {
                return Path.Combine(ResolveProjectRootOrFallback(), "Pictures", "Screenshot");
            }

            return Path.Combine(Application.persistentDataPath, "Screenshots");
        }

        private static string ResolveProjectRootOrFallback()
        {
            var assetsDirectory = Application.dataPath;
            if (string.IsNullOrWhiteSpace(assetsDirectory))
            {
                return Directory.GetCurrentDirectory();
            }

            var parent = Directory.GetParent(assetsDirectory);
            return parent != null ? parent.FullName : Directory.GetCurrentDirectory();
        }

        private static string SanitizeFileNameFragment(string value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return "untagged";
            }

            var invalidCharacters = Path.GetInvalidFileNameChars();
            var sanitized = value;
            for (var index = 0; index < invalidCharacters.Length; index++)
            {
                sanitized = sanitized.Replace(invalidCharacters[index], '-');
            }

            return sanitized.Replace(' ', '-');
        }

        private void CaptureCameraToPng(string outputPath)
        {
            var captureCamera = ResolveGameplayCamera();
            if (captureCamera == null)
            {
                throw new System.InvalidOperationException("Gameplay camera not found for clean local screenshot capture.");
            }

            const int renderWidth = 1600;
            const int renderHeight = 900;
            var previousTargetTexture = captureCamera.targetTexture;
            var previousActive = RenderTexture.active;
            var renderTexture = new RenderTexture(renderWidth, renderHeight, 24, RenderTextureFormat.ARGB32);
            var texture = new Texture2D(renderWidth, renderHeight, TextureFormat.RGB24, false);

            try
            {
                captureCamera.targetTexture = renderTexture;
                RenderTexture.active = renderTexture;
                captureCamera.Render();
                texture.ReadPixels(new Rect(0f, 0f, renderWidth, renderHeight), 0, 0, false);
                texture.Apply(false, false);
                File.WriteAllBytes(outputPath, texture.EncodeToPNG());
            }
            finally
            {
                captureCamera.targetTexture = previousTargetTexture;
                RenderTexture.active = previousActive;
                Destroy(renderTexture);
                Destroy(texture);
            }
        }

        private Camera ResolveGameplayCamera()
        {
            Camera captureCamera = null;
            if (quarterViewCameraRig != null)
            {
                captureCamera = quarterViewCameraRig.GetComponent<Camera>();
                if (captureCamera == null)
                {
                    captureCamera = quarterViewCameraRig.GetComponentInChildren<Camera>();
                }
            }

            if (captureCamera == null)
            {
                captureCamera = Camera.main;
            }

            if (captureCamera == null)
            {
                captureCamera = FindFirstObjectByType<Camera>();
            }

            if (captureCamera == null)
            {
                return null;
            }

            captureCamera.enabled = true;
            return captureCamera;
        }

        private ScreenshotAutomationRequest TryReadScreenshotRequest()
        {
            var requestPath = ResolveAutomationPath(ScreenshotRequestRelativePath);
            if (!File.Exists(requestPath))
            {
                return null;
            }

            try
            {
                var json = File.ReadAllText(requestPath);
                if (string.IsNullOrWhiteSpace(json))
                {
                    return null;
                }

                return JsonUtility.FromJson<ScreenshotAutomationRequest>(json);
            }
            catch (System.Exception exception)
            {
                Debug.LogWarning("[DeepStakeDev] Failed to read screenshot request. " + exception.Message);
                return null;
            }
        }

        private void DeleteScreenshotRequestFile()
        {
            var requestPath = ResolveAutomationPath(ScreenshotRequestRelativePath);
            if (File.Exists(requestPath))
            {
                File.Delete(requestPath);
            }
        }

        private void WriteScreenshotStatus(string state, string screenshotPath, bool cleanSceneCapture, bool hideUi, string note)
        {
            try
            {
                var statusPath = ResolveAutomationPath(ScreenshotStatusRelativePath);
                var statusDirectory = Path.GetDirectoryName(statusPath);
                if (!string.IsNullOrWhiteSpace(statusDirectory))
                {
                    Directory.CreateDirectory(statusDirectory);
                }

                var status = new ScreenshotAutomationStatus
                {
                    state = state,
                    screenshotPath = screenshotPath ?? string.Empty,
                    cleanSceneCapture = cleanSceneCapture,
                    hideUi = hideUi,
                    note = note ?? string.Empty
                };

                File.WriteAllText(statusPath, JsonUtility.ToJson(status, true));
            }
            catch (System.Exception exception)
            {
                Debug.LogWarning("[DeepStakeDev] Failed to write screenshot status. " + exception.Message);
            }
        }

        private static string ResolveAutomationPath(string relativePath)
        {
            return Path.GetFullPath(Path.Combine(ResolveProjectRootOrFallback(), relativePath));
        }

        private static System.Collections.Generic.List<CanvasState> SetAllCanvasesEnabled(bool enabled)
        {
            var canvases = FindObjectsByType<Canvas>(FindObjectsInactive.Exclude, FindObjectsSortMode.None);
            var states = new System.Collections.Generic.List<CanvasState>(canvases.Length);
            for (var index = 0; index < canvases.Length; index++)
            {
                var canvas = canvases[index];
                if (canvas == null)
                {
                    continue;
                }

                states.Add(new CanvasState(canvas, canvas.enabled));
                canvas.enabled = enabled;
            }

            return states;
        }

        private static void RestoreCanvasStates(System.Collections.Generic.List<CanvasState> states)
        {
            if (states == null)
            {
                return;
            }

            for (var index = 0; index < states.Count; index++)
            {
                var state = states[index];
                if (state.Canvas != null)
                {
                    state.Canvas.enabled = state.Enabled;
                }
            }
        }

        [System.Serializable]
        private sealed class ScreenshotAutomationRequest
        {
            public string requestId = string.Empty;
            public string screenshotPath = string.Empty;
            public string verificationTag = string.Empty;
            public bool cleanSceneCapture;
            public bool hideUi;
        }

        [System.Serializable]
        private sealed class ScreenshotAutomationStatus
        {
            public string state = string.Empty;
            public string screenshotPath = string.Empty;
            public bool cleanSceneCapture;
            public bool hideUi;
            public string note = string.Empty;
        }

        private readonly struct CanvasState
        {
            public CanvasState(Canvas canvas, bool enabled)
            {
                Canvas = canvas;
                Enabled = enabled;
            }

            public Canvas Canvas { get; }

            public bool Enabled { get; }
        }
    }
}
