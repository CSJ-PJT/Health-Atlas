using System;
using System.IO;
using DeepStake.Boot;
using DeepStake.CameraRig;
using DeepStake.Rendering;
using DeepStake.World;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;
using System.Collections.Generic;

namespace DeepStake.EditorTools
{
    [InitializeOnLoad]
    public static class DeepStakeScreenshotCapture
    {
        private const string BootScenePath = "Assets/Scenes/Boot.unity";
        private const string WorldScenePath = "Assets/Scenes/WorldPrototype3D.unity";
        private const string MeshyFirstAppliedScreenshotPath = "Pictures/Screenshot/local-meshy-first-applied-pass.png";
        private const string MeshyFirstAppliedCleanScreenshotPath = "Pictures/Screenshot/local-meshy-first-applied-clean.png";
        private const string ScreenshotRequestRelativePath = "Library/DeepStakeAutomation/screenshot_request.json";
        private const string ScreenshotDirArgPrefix = "-deepstakeScreenshotDir=";
        private const string ScreenshotTimeoutArgPrefix = "-deepstakeScreenshotTimeoutSeconds=";
        private const string VerificationTagArgPrefix = "-deepstakeVerificationTag=";
        private const string StartupCaptureModeArgPrefix = "-deepstakeStartupCaptureMode=";
        private const string StartupCaptureStateKey = "DeepStake.StartupCaptureState";
        private const int DefaultRenderWidth = 1600;
        private const int DefaultRenderHeight = 900;

        private static double editorPlayDeadline;
        private static double editorPlayCaptureReadyTime;
        private static string editorPlayScreenshotPath = string.Empty;
        private static bool editorPlayCaptureSucceeded;
        private static bool editorPlayCleanSceneCapture;
        private static bool startupCaptureQueued;

        static DeepStakeScreenshotCapture()
        {
            TryQueueStartupCapture();
        }

        [MenuItem("DeepStake/Validation/Capture Meshy First Applied Screenshot")]
        public static void CaptureMeshyFirstAppliedScreenshotMenu()
        {
            try
            {
                var screenshotPath = NormalizeOutputPath(MeshyFirstAppliedScreenshotPath);
                CaptureEditorRenderInternal(screenshotPath);
                Debug.Log("[DeepStakeCapture] Meshy validation screenshot captured: " + screenshotPath);
                EditorUtility.RevealInFinder(screenshotPath);
            }
            catch (Exception exception)
            {
                Debug.LogError("[DeepStakeCapture] Meshy validation screenshot capture failed: " + exception);
                throw;
            }
        }

        [MenuItem("DeepStake/Validation/Capture Meshy First Applied Clean Screenshot")]
        public static void CaptureMeshyFirstAppliedCleanScreenshotMenu()
        {
            try
            {
                StartEditorPlayCaptureInternal(
                    NormalizeOutputPath(MeshyFirstAppliedCleanScreenshotPath),
                    "meshy-first-applied-clean",
                    600,
                    cleanSceneCapture: true);
            }
            catch (Exception exception)
            {
                Debug.LogError("[DeepStakeCapture] Meshy clean validation screenshot capture failed: " + exception);
                throw;
            }
        }

        private static void TryQueueStartupCapture()
        {
            if (startupCaptureQueued)
            {
                return;
            }

            if (EditorApplication.isPlayingOrWillChangePlaymode)
            {
                return;
            }

            var startupCaptureMode = GetCommandLineValue(StartupCaptureModeArgPrefix);
            if (!string.Equals(startupCaptureMode, "EditorRender", StringComparison.OrdinalIgnoreCase) &&
                !string.Equals(startupCaptureMode, "EditorPlay", StringComparison.OrdinalIgnoreCase))
            {
                return;
            }

            var startupCaptureState = SessionState.GetString(StartupCaptureStateKey, string.Empty);
            if (string.Equals(startupCaptureState, "arming", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(startupCaptureState, "capturing", StringComparison.OrdinalIgnoreCase))
            {
                return;
            }

            startupCaptureQueued = true;
            SessionState.SetString(StartupCaptureStateKey, "arming");
            EditorApplication.delayCall += () =>
            {
                try
                {
                    if (string.Equals(startupCaptureMode, "EditorPlay", StringComparison.OrdinalIgnoreCase))
                    {
                        StartStartupEditorPlayCapture();
                        return;
                    }

                    var screenshotPath = RequireScreenshotPath();
                    CaptureEditorRenderInternal(screenshotPath);
                    Debug.Log("[DeepStakeCapture] Startup EditorRender capture succeeded: " + screenshotPath);
                    SessionState.EraseString(StartupCaptureStateKey);
                    EditorApplication.Exit(0);
                }
                catch (Exception exception)
                {
                    Debug.LogError("[DeepStakeCapture] Startup capture failed: " + exception);
                    SessionState.EraseString(StartupCaptureStateKey);
                    EditorApplication.Exit(1);
                }
            };
        }

        public static void CaptureEditorRenderCli()
        {
            try
            {
                var screenshotPath = RequireScreenshotPath();
                CaptureEditorRenderInternal(screenshotPath);
                Debug.Log("[DeepStakeCapture] EditorRender capture succeeded: " + screenshotPath);
                EditorApplication.Exit(0);
            }
            catch (Exception exception)
            {
                Debug.LogError("[DeepStakeCapture] EditorRender capture failed: " + exception);
                CleanupEditorPlayCapture(1);
            }
        }

        public static void CaptureEditorPlayCli()
        {
            try
            {
                StartEditorPlayCaptureInternal(
                    RequireScreenshotPath(),
                    GetCommandLineValue(VerificationTagArgPrefix),
                    GetCommandLineIntValue(ScreenshotTimeoutArgPrefix, 600),
                    cleanSceneCapture: false);
            }
            catch (Exception exception)
            {
                Debug.LogError("[DeepStakeCapture] EditorPlay capture setup failed: " + exception);
                CleanupEditorPlayCapture(1);
            }
        }

        public static void CaptureEditorPlayCleanCli()
        {
            try
            {
                StartEditorPlayCaptureInternal(
                    RequireScreenshotPath(),
                    GetCommandLineValue(VerificationTagArgPrefix),
                    GetCommandLineIntValue(ScreenshotTimeoutArgPrefix, 600),
                    cleanSceneCapture: true);
            }
            catch (Exception exception)
            {
                Debug.LogError("[DeepStakeCapture] EditorPlay capture setup failed: " + exception);
                CleanupEditorPlayCapture(1);
            }
        }

        private static void StartStartupEditorPlayCapture()
        {
            SessionState.SetString(StartupCaptureStateKey, "capturing");
            EditorSceneManager.OpenScene(BootScenePath, OpenSceneMode.Single);
            EditorApplication.delayCall += () =>
            {
                try
                {
                    StartEditorPlayCaptureInternal(
                        RequireScreenshotPath(),
                        GetCommandLineValue(VerificationTagArgPrefix),
                        GetCommandLineIntValue(ScreenshotTimeoutArgPrefix, 600),
                        cleanSceneCapture: true);
                }
                catch (Exception exception)
                {
                    Debug.LogError("[DeepStakeCapture] Startup EditorPlay capture setup failed: " + exception);
                    CleanupEditorPlayCapture(1);
                }
            };
        }

        private static void StartEditorPlayCaptureInternal(string screenshotPath, string verificationTag, int timeoutSeconds, bool cleanSceneCapture)
        {
            ValidateScenes();
            WriteScreenshotRequest(screenshotPath, verificationTag, cleanSceneCapture, hideUi: cleanSceneCapture);
            DeepStakeDevLaunchOptions.SetEditorOverrides(
                autorun: true,
                forceMobileControls: !cleanSceneCapture,
                tag: verificationTag,
                captureScreenshot: true,
                cleanSceneCaptureOverride: cleanSceneCapture,
                screenshotDirectoryOverride: screenshotPath,
                quitAfterScreenshotOverride: false);

            editorPlayScreenshotPath = screenshotPath;
            editorPlayCaptureSucceeded = false;
            editorPlayCleanSceneCapture = cleanSceneCapture;
            editorPlayDeadline = EditorApplication.timeSinceStartup + Mathf.Max(30, timeoutSeconds);
            editorPlayCaptureReadyTime = 0d;

            Debug.Log("[DeepStakeCapture] Starting EditorPlay capture. output=" + screenshotPath +
                      " tag=" + verificationTag + " timeoutSeconds=" + timeoutSeconds +
                      " cleanSceneCapture=" + cleanSceneCapture);

            EditorApplication.playModeStateChanged -= OnEditorPlayStateChanged;
            EditorApplication.update -= PollEditorPlayCapture;
            EditorApplication.playModeStateChanged += OnEditorPlayStateChanged;
            EditorApplication.update += PollEditorPlayCapture;
            EditorApplication.isPlaying = true;
        }

        private static void PrepareFirstScreenVisualState(WorldPrototype3DController controller)
        {
            var serializedController = new SerializedObject(controller);
            var zoneRoot = GetObjectReference<Transform>(serializedController, "zoneRoot");
            var worldPrototypeJson = GetObjectReference<TextAsset>(serializedController, "worldPrototypeJson");
            var definition = WorldPrototype3DDefinition.FromJson(worldPrototypeJson);

            if (zoneRoot == null)
            {
                throw new InvalidOperationException("WorldPrototype3DController.zoneRoot is not assigned.");
            }

            WorldPrototypeVisualPass.RebuildZoneVisuals(
                zoneRoot,
                definition,
                GetObjectReference<Material>(serializedController, "fieldMaterial"),
                GetObjectReference<Material>(serializedController, "archiveMaterial"),
                GetObjectReference<Material>(serializedController, "placementMaterial"),
                GetObjectReference<Material>(serializedController, "roadMaterial"),
                GetObjectReference<Material>(serializedController, "storageMaterial"));
            var playerTransform = GetObjectReference<Transform>(serializedController, "playerTransform");
            if (playerTransform != null)
            {
                playerTransform.position = new Vector3(definition.playerSpawn.x, 0.5f, definition.playerSpawn.z);
                WorldPrototypeVisualPass.EnsureCutePlayerProxy(playerTransform);
            }

            var npcTransform = GetObjectReference<Transform>(serializedController, "npcTransform");
            if (npcTransform != null && definition.npcStubs.Length > 0)
            {
                npcTransform.position = new Vector3(definition.npcStubs[0].x, 0.5f, definition.npcStubs[0].z);
                WorldPrototypeVisualPass.EnsureArchivistProxy(npcTransform);
            }

            var secondaryNpcTransform = GetObjectReference<Transform>(serializedController, "secondaryNpcTransform");
            if (secondaryNpcTransform != null && definition.npcStubs.Length > 1)
            {
                secondaryNpcTransform.position = new Vector3(definition.npcStubs[1].x, 0.5f, definition.npcStubs[1].z);
            }

            ApplyInteractableVisual(serializedController, "interactableTransform", definition, 0, "farm-sign");
            ApplyInteractableVisual(serializedController, "secondaryInteractableTransform", definition, 1, "supply-cache");
            ApplyInteractableVisual(serializedController, "tertiaryInteractableTransform", definition, 2, "observer-record");
            ApplyPlacementVisual(serializedController, "placementMarkerTransform", definition, 0, "recovery-beacon");
            ApplyPlacementVisual(serializedController, "secondaryPlacementMarkerTransform", definition, 1, "supply-relay");
            ApplyPlacementVisual(serializedController, "placementPreviewRoot", definition, 0, "recovery-beacon");
            ApplyPlacementVisual(serializedController, "secondaryPlacementPreviewRoot", definition, 1, "supply-relay");
            DeepStakePbrEnvironmentPipeline.ApplyToWorld(
                zoneRoot,
                GetObjectReference<Transform>(serializedController, "interactableTransform"),
                GetObjectReference<Transform>(serializedController, "secondaryInteractableTransform"),
                GetObjectReference<Transform>(serializedController, "tertiaryInteractableTransform"),
                GetObjectReference<Transform>(serializedController, "placementMarkerTransform"),
                GetObjectReference<Transform>(serializedController, "secondaryPlacementMarkerTransform"),
                GetObjectReference<Transform>(serializedController, "placementPreviewRoot"),
                GetObjectReference<Transform>(serializedController, "secondaryPlacementPreviewRoot"));

            var quarterViewCameraRig = GetObjectReference<QuarterViewCameraRig>(serializedController, "quarterViewCameraRig");
            if (quarterViewCameraRig != null && playerTransform != null)
            {
                var requestedOffset = new Vector3(
                    definition.cameraOffset.x,
                    definition.cameraOffset.y,
                    definition.cameraOffset.z);
                quarterViewCameraRig.Configure(playerTransform, requestedOffset);
                ApplyQuarterViewCameraFrame(quarterViewCameraRig.transform, playerTransform, requestedOffset);
            }
        }

        private static void ApplyInteractableVisual(
            SerializedObject serializedController,
            string propertyName,
            WorldPrototype3DDefinition definition,
            int definitionIndex,
            string visualKind)
        {
            var target = GetObjectReference<Transform>(serializedController, propertyName);
            if (target == null || definition.interactables.Length <= definitionIndex)
            {
                return;
            }

            target.position = new Vector3(definition.interactables[definitionIndex].x, 0.75f, definition.interactables[definitionIndex].z);
            WorldPrototypeVisualPass.EnsureWorldPropVisual(target, visualKind);
        }

        private static void ApplyPlacementVisual(
            SerializedObject serializedController,
            string propertyName,
            WorldPrototype3DDefinition definition,
            int definitionIndex,
            string visualKind)
        {
            var target = GetObjectReference<Transform>(serializedController, propertyName);
            if (target == null || definition.placementZones.Length <= definitionIndex)
            {
                return;
            }

            target.position = new Vector3(definition.placementZones[definitionIndex].x, 0.5f, definition.placementZones[definitionIndex].z);
            WorldPrototypeVisualPass.EnsureWorldPropVisual(target, visualKind);
        }

        private static Camera ResolveCaptureCamera(WorldPrototype3DController controller)
        {
            var serializedController = new SerializedObject(controller);
            var quarterViewCameraRig = GetObjectReference<QuarterViewCameraRig>(serializedController, "quarterViewCameraRig");
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
                captureCamera = UnityEngine.Object.FindFirstObjectByType<Camera>();
            }

            if (captureCamera != null)
            {
                captureCamera.enabled = true;
                captureCamera.clearFlags = CameraClearFlags.SolidColor;
                captureCamera.backgroundColor = new Color(0.56f, 0.62f, 0.61f);
                captureCamera.fieldOfView = Mathf.Clamp(captureCamera.fieldOfView, 38f, 42f);
                ForceCameraFrameToFirstScreen(captureCamera);
            }
            DeepStakePbrEnvironmentPipeline.ApplyLightingProfile();
            return captureCamera;
        }

        private static void ForceCameraFrameToFirstScreen(Camera captureCamera)
        {
            if (captureCamera == null)
            {
                return;
            }

            var player = GameObject.Find("Player3D");
            var notice = GameObject.Find("OutpostNotice3D") ?? GameObject.Find("FarmSign3D");
            var playerPosition = player != null ? player.transform.position : new Vector3(0f, 0.5f, 0f);
            var noticePosition = notice != null ? notice.transform.position : new Vector3(-3f, 0.75f, 2f);
            var routeCenter = Vector3.Lerp(playerPosition, noticePosition, 0.66f);
            var lookTarget = routeCenter + new Vector3(-0.2f, 0.86f, 0.2f);
            var capturePosition = lookTarget + new Vector3(4.15f, 4.35f, -4.2f);

            captureCamera.transform.position = capturePosition;
            captureCamera.transform.rotation = Quaternion.LookRotation((lookTarget - capturePosition).normalized, Vector3.up);
            captureCamera.nearClipPlane = 0.1f;
            captureCamera.farClipPlane = 180f;
            captureCamera.cullingMask = ~0;

            Debug.Log(
                "[DeepStakeCapture] Forced first-screen camera frame. position=" + capturePosition +
                " lookTarget=" + lookTarget +
                " player=" + playerPosition +
                " notice=" + noticePosition);
        }

        private static bool TryGetSceneRenderBounds(out Bounds combinedBounds)
        {
            var renderers = UnityEngine.Object.FindObjectsByType<Renderer>(FindObjectsInactive.Exclude, FindObjectsSortMode.None);
            var found = false;
            combinedBounds = default;

            for (var index = 0; index < renderers.Length; index++)
            {
                var renderer = renderers[index];
                if (renderer == null || !renderer.enabled)
                {
                    continue;
                }

                var gameObject = renderer.gameObject;
                if (!gameObject.activeInHierarchy)
                {
                    continue;
                }

                if ((renderer is ParticleSystemRenderer) || gameObject.GetComponent<Camera>() != null)
                {
                    continue;
                }

                if (!found)
                {
                    combinedBounds = renderer.bounds;
                    found = true;
                }
                else
                {
                    combinedBounds.Encapsulate(renderer.bounds);
                }
            }

            return found;
        }

        private static void CaptureEditorRenderInternal(string screenshotPath)
        {
            ValidateScenes();

            EditorSceneManager.OpenScene(WorldScenePath, OpenSceneMode.Single);
            var controller = UnityEngine.Object.FindFirstObjectByType<WorldPrototype3DController>();
            if (controller == null)
            {
                throw new InvalidOperationException("WorldPrototype3DController not found in WorldPrototype3D scene.");
            }

            PrepareFirstScreenVisualState(controller);
            var captureCamera = ResolveCaptureCamera(controller);
            if (captureCamera == null)
            {
                throw new InvalidOperationException("Gameplay camera not found for editor render capture.");
            }

            RenderCameraToPng(captureCamera, screenshotPath, DefaultRenderWidth, DefaultRenderHeight);
        }

        private static void ApplyQuarterViewCameraFrame(Transform cameraTransform, Transform target, Vector3 requestedOffset)
        {
            if (cameraTransform == null || target == null)
            {
                return;
            }

            var planar = new Vector3(requestedOffset.x, 0f, requestedOffset.z);
            if (planar.sqrMagnitude < 0.01f)
            {
                planar = new Vector3(1f, 0f, -1f);
            }

            var clampedDistance = Mathf.Clamp(planar.magnitude, 4.95f, 5.95f);
            var readableHeight = Mathf.Clamp(requestedOffset.y, 4.2f, 5.2f);
            var normalizedPlanar = planar.normalized * clampedDistance;
            var effectiveOffset = new Vector3(normalizedPlanar.x, readableHeight, normalizedPlanar.z);
            cameraTransform.position = target.position + effectiveOffset;
            cameraTransform.LookAt(target.position + Vector3.up * 1.16f);
        }

        private static void RenderCameraToPng(Camera captureCamera, string outputPath, int width, int height)
        {
            var directory = Path.GetDirectoryName(outputPath);
            if (!string.IsNullOrWhiteSpace(directory))
            {
                Directory.CreateDirectory(directory);
            }

            var previousTargetTexture = captureCamera.targetTexture;
            var previousActive = RenderTexture.active;
            var renderTexture = new RenderTexture(width, height, 24, RenderTextureFormat.ARGB32);
            var texture = new Texture2D(width, height, TextureFormat.RGB24, false);

            try
            {
                captureCamera.targetTexture = renderTexture;
                RenderTexture.active = renderTexture;
                captureCamera.Render();
                texture.ReadPixels(new Rect(0f, 0f, width, height), 0, 0, false);
                texture.Apply(false, false);
                File.WriteAllBytes(outputPath, texture.EncodeToPNG());
            }
            finally
            {
                captureCamera.targetTexture = previousTargetTexture;
                RenderTexture.active = previousActive;
                UnityEngine.Object.DestroyImmediate(renderTexture);
                UnityEngine.Object.DestroyImmediate(texture);
            }
        }

        private static void OnEditorPlayStateChanged(PlayModeStateChange change)
        {
            if (change == PlayModeStateChange.EnteredEditMode)
            {
                if (editorPlayCaptureSucceeded)
                {
                    CleanupEditorPlayCapture(0);
                    return;
                }

                if (string.IsNullOrWhiteSpace(editorPlayScreenshotPath) || !File.Exists(editorPlayScreenshotPath))
                {
                    Debug.LogError("[DeepStakeCapture] EditorPlay returned to edit mode without producing screenshot.");
                    CleanupEditorPlayCapture(1);
                }
            }
        }

        private static void PollEditorPlayCapture()
        {
            if (editorPlayCleanSceneCapture && TryCaptureCleanSceneWhilePlaying())
            {
                return;
            }

            if (!string.IsNullOrWhiteSpace(editorPlayScreenshotPath) && File.Exists(editorPlayScreenshotPath))
            {
                editorPlayCaptureSucceeded = true;
                Debug.Log("[DeepStakeCapture] EditorPlay screenshot capture succeeded: " + editorPlayScreenshotPath);
                if (EditorApplication.isPlaying)
                {
                    EditorApplication.isPlaying = false;
                }
                else
                {
                    CleanupEditorPlayCapture(0);
                }
                return;
            }

            if (EditorApplication.timeSinceStartup < editorPlayDeadline)
            {
                return;
            }

            Debug.LogError("[DeepStakeCapture] EditorPlay screenshot capture timed out. expected=" + editorPlayScreenshotPath);
            CleanupEditorPlayCapture(1);
        }

        private static bool TryCaptureCleanSceneWhilePlaying()
        {
            if (!EditorApplication.isPlaying)
            {
                return false;
            }

            var activeScene = SceneManager.GetActiveScene();
            if (!activeScene.IsValid() || !string.Equals(activeScene.path, WorldScenePath, StringComparison.OrdinalIgnoreCase))
            {
                return false;
            }

            if (editorPlayCaptureReadyTime <= 0d)
            {
                editorPlayCaptureReadyTime = EditorApplication.timeSinceStartup + 1.0d;
                return false;
            }

            if (EditorApplication.timeSinceStartup < editorPlayCaptureReadyTime)
            {
                return false;
            }

            var controller = UnityEngine.Object.FindFirstObjectByType<WorldPrototype3DController>();
            if (controller == null || !controller.isActiveAndEnabled)
            {
                return false;
            }

            var captureCamera = ResolveCaptureCamera(controller);
            if (captureCamera == null)
            {
                return false;
            }

            RenderCameraToPng(captureCamera, editorPlayScreenshotPath, DefaultRenderWidth, DefaultRenderHeight);
            editorPlayCaptureSucceeded = true;
            Debug.Log("[DeepStakeCapture] Clean EditorPlay scene capture succeeded: " + editorPlayScreenshotPath);
            EditorApplication.isPlaying = false;
            return true;
        }

        private static void CleanupEditorPlayCapture(int exitCode)
        {
            EditorApplication.playModeStateChanged -= OnEditorPlayStateChanged;
            EditorApplication.update -= PollEditorPlayCapture;
            SessionState.EraseString(StartupCaptureStateKey);

            if (EditorApplication.isPlaying)
            {
                EditorApplication.isPlaying = false;
            }

            DeepStakeDevLaunchOptions.ClearEditorOverrides();
            editorPlayDeadline = 0d;
            editorPlayCaptureReadyTime = 0d;
            editorPlayScreenshotPath = string.Empty;
            editorPlayCaptureSucceeded = false;
            editorPlayCleanSceneCapture = false;
            EditorApplication.Exit(exitCode);
        }

        private static void ValidateScenes()
        {
            if (!File.Exists(BootScenePath))
            {
                throw new FileNotFoundException("Boot scene is missing: " + BootScenePath);
            }

            if (!File.Exists(WorldScenePath))
            {
                throw new FileNotFoundException("World scene is missing: " + WorldScenePath);
            }
        }

        private static string RequireScreenshotPath()
        {
            var screenshotPath = GetCommandLineValue(ScreenshotDirArgPrefix);
            if (string.IsNullOrWhiteSpace(screenshotPath))
            {
                throw new InvalidOperationException("Screenshot capture requires -deepstakeScreenshotDir=<absolute png path>.");
            }

            var normalizedPath = NormalizeOutputPath(screenshotPath);
            var screenshotDirectory = Path.GetDirectoryName(normalizedPath);
            if (!string.IsNullOrWhiteSpace(screenshotDirectory))
            {
                Directory.CreateDirectory(screenshotDirectory);
            }

            return normalizedPath;
        }

        private static T GetObjectReference<T>(SerializedObject serializedObject, string propertyName) where T : UnityEngine.Object
        {
            return serializedObject.FindProperty(propertyName)?.objectReferenceValue as T;
        }

        private static string GetCommandLineValue(string prefix)
        {
            var args = System.Environment.GetCommandLineArgs();
            for (var index = 0; index < args.Length; index++)
            {
                var value = args[index];
                if (value.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
                {
                    return value.Substring(prefix.Length);
                }
            }

            return string.Empty;
        }

        private static int GetCommandLineIntValue(string prefix, int defaultValue)
        {
            var rawValue = GetCommandLineValue(prefix);
            if (int.TryParse(rawValue, out var parsedValue))
            {
                return parsedValue;
            }

            return defaultValue;
        }

        private static string NormalizeOutputPath(string outputPath)
        {
            if (Path.IsPathRooted(outputPath))
            {
                return outputPath;
            }

            return Path.GetFullPath(Path.Combine(Directory.GetCurrentDirectory(), outputPath));
        }

        private static void WriteScreenshotRequest(string screenshotPath, string verificationTag, bool cleanSceneCapture, bool hideUi)
        {
            var requestPath = NormalizeOutputPath(ScreenshotRequestRelativePath);
            var requestDirectory = Path.GetDirectoryName(requestPath);
            if (!string.IsNullOrWhiteSpace(requestDirectory))
            {
                Directory.CreateDirectory(requestDirectory);
            }

            var request = new ScreenshotAutomationRequest
            {
                requestId = Guid.NewGuid().ToString("N"),
                screenshotPath = screenshotPath,
                verificationTag = verificationTag ?? string.Empty,
                cleanSceneCapture = cleanSceneCapture,
                hideUi = hideUi
            };

            File.WriteAllText(requestPath, JsonUtility.ToJson(request, true));
            Debug.Log("[DeepStakeCapture] Wrote screenshot request: " + requestPath);
        }

        [Serializable]
        private sealed class ScreenshotAutomationRequest
        {
            public string requestId = string.Empty;
            public string screenshotPath = string.Empty;
            public string verificationTag = string.Empty;
            public bool cleanSceneCapture;
            public bool hideUi;
        }
    }
}
