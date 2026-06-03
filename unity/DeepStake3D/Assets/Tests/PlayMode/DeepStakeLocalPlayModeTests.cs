using System.Collections;
using System.IO;
using DeepStake.Boot;
using DeepStake.CameraRig;
using DeepStake.Construction;
using DeepStake.Core;
using DeepStake.Interaction;
using DeepStake.Quests;
using DeepStake.Save;
using DeepStake.Settlement;
using DeepStake.UI;
using DeepStake.World;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.UI;
using UnityEngine.TestTools;

namespace DeepStake.Tests.PlayMode
{
    public sealed class DeepStakeLocalPlayModeTests
    {
        private const string BootScene = "Boot";
        private const string MainMenuScene = "MainMenu";
        private const string WorldScene = "WorldPrototype3D";
        private const string ModularConstructionScene = "ModularConstructionPrototype";

        [UnitySetUp]
        public IEnumerator SetUp()
        {
            DeepStakeDevLaunchOptions.ClearEditorOverrides();
            yield return LoadScene(BootScene);
            yield return CleanupPersistentState();
        }

        [UnityTearDown]
        public IEnumerator TearDown()
        {
            DeepStakeDevLaunchOptions.ClearEditorOverrides();
            yield return CleanupPersistentState();
        }

        [UnityTest]
        public IEnumerator BootScene_CanLoad()
        {
            yield return LoadScene(BootScene);

            Assert.That(SceneManager.GetActiveScene().name, Is.EqualTo(BootScene));
            Assert.That(Object.FindFirstObjectByType<DeepStakeBootstrap>(), Is.Not.Null);
        }

        [UnityTest]
        public IEnumerator MainMenuScene_CanLoad()
        {
            yield return LoadScene(MainMenuScene);

            Assert.That(SceneManager.GetActiveScene().name, Is.EqualTo(MainMenuScene));
            Assert.That(Object.FindFirstObjectByType<MainMenuController>(), Is.Not.Null);
            Assert.That(Object.FindFirstObjectByType<Canvas>(), Is.Not.Null);
        }

        [UnityTest]
        public IEnumerator WorldPrototype3D_CanLoad_WithCoreObjects()
        {
            DeepStakeDevLaunchOptions.SetEditorOverrides(false, true, "playmode-world-load");
            yield return LoadScene(WorldScene);
            yield return WaitFrames(3);

            var world = Object.FindFirstObjectByType<WorldPrototype3DController>();
            Assert.That(SceneManager.GetActiveScene().name, Is.EqualTo(WorldScene));
            Assert.That(world, Is.Not.Null);
            Assert.That(world.PlayerTransform, Is.Not.Null);
            Assert.That(Object.FindFirstObjectByType<QuarterViewCameraRig>(), Is.Not.Null);
            Assert.That(Camera.main, Is.Not.Null);
            Assert.That(Object.FindFirstObjectByType<GuidanceOverlayView>(), Is.Not.Null);
            Assert.That(Object.FindFirstObjectByType<MobileControlsOverlay>(), Is.Not.Null);
            Assert.That(world.PrimaryInteractable, Is.Not.Null);
            Assert.That(world.TertiaryInteractable, Is.Not.Null);
            Assert.That(world.QuestNpc, Is.Not.Null);
            Assert.That(world.PrimaryPlacement, Is.Not.Null);
        }

        [UnityTest]
        public IEnumerator ModularConstructionPrototype_CanPlaceRotateRemove_WithChunkData()
        {
            yield return LoadScene(ModularConstructionScene);
            yield return WaitFrames(2);

            var controller = Object.FindFirstObjectByType<ModularConstructionPrototypeController>();
            Assert.That(SceneManager.GetActiveScene().name, Is.EqualTo(ModularConstructionScene));
            Assert.That(controller, Is.Not.Null);
            Assert.That(controller.TileSizeMeters, Is.EqualTo(1f));
            Assert.That(controller.ChunkSizeTiles, Is.EqualTo(32));
            controller.ClearPlacedPieces();

            var globalTile = new Vector2Int(34, -1);
            var expectedChunk = controller.GlobalTileToChunk(globalTile);
            var expectedLocalTile = controller.GlobalTileToLocalTile(globalTile, expectedChunk);
            var beforeCount = controller.PlacedPieceCount;

            Assert.That(controller.TryPlacePieceAtGlobalTile(ModularBuildPieceId.WindowWall, globalTile, 450), Is.True);
            Assert.That(controller.PlacedPieceCount, Is.EqualTo(beforeCount + 1));
            Assert.That(ModularConstructionPrototypeController.NormalizeRotation(450), Is.EqualTo(90));

            ModularConstructionTile placedTile = null;
            foreach (var chunk in controller.ChunkRecords)
            {
                if (chunk.chunkX == expectedChunk.x && chunk.chunkY == expectedChunk.y)
                {
                    chunk.TryGetTile(expectedLocalTile, out placedTile);
                    break;
                }
            }

            Assert.That(placedTile, Is.Not.Null);
            Assert.That(placedTile.pieces.Count, Is.EqualTo(1));
            Assert.That(placedTile.pieces[0].pieceId, Is.EqualTo(ModularBuildPieceId.WindowWall.ToString()));
            Assert.That(placedTile.pieces[0].rotation, Is.EqualTo(90));

            Assert.That(controller.TryRemoveTopPieceAtGlobalTile(globalTile), Is.True);
            Assert.That(controller.PlacedPieceCount, Is.EqualTo(beforeCount));
        }

        [UnityTest]
        public IEnumerator ModularConstructionPrototype_CanSaveClearAndRestorePlacedPieces()
        {
            var savePath = ModularConstructionPrototypeController.GetSaveFilePath();
            var backupPath = savePath + ".playmode-backup";
            var hadExistingSave = File.Exists(savePath);

            if (hadExistingSave)
            {
                Directory.CreateDirectory(Path.GetDirectoryName(backupPath) ?? ".");
                File.Copy(savePath, backupPath, true);
                File.Delete(savePath);
            }

            yield return LoadScene(ModularConstructionScene);
            yield return WaitFrames(2);

            var controller = Object.FindFirstObjectByType<ModularConstructionPrototypeController>();
            Assert.That(controller, Is.Not.Null);
            Assert.That(savePath, Does.EndWith(Path.Combine("DeepStake3D", "modular-construction-prototype.json")));

            var globalTile = new Vector2Int(65, 66);
            var expectedChunk = controller.GlobalTileToChunk(globalTile);
            var expectedLocalTile = controller.GlobalTileToLocalTile(globalTile, expectedChunk);

            Assert.That(controller.TryPlacePieceAtGlobalTile(ModularBuildPieceId.Gate, globalTile, -90), Is.True);
            Assert.That(controller.TryGetTopPieceAtGlobalTile(globalTile, out var placedBeforeSave), Is.True);
            Assert.That(placedBeforeSave.pieceId, Is.EqualTo(ModularBuildPieceId.Gate.ToString()));
            Assert.That(placedBeforeSave.chunkX, Is.EqualTo(expectedChunk.x));
            Assert.That(placedBeforeSave.chunkY, Is.EqualTo(expectedChunk.y));
            Assert.That(placedBeforeSave.tileX, Is.EqualTo(expectedLocalTile.x));
            Assert.That(placedBeforeSave.tileY, Is.EqualTo(expectedLocalTile.y));
            Assert.That(placedBeforeSave.rotation, Is.EqualTo(270));
            Assert.That(placedBeforeSave.state, Is.EqualTo("built"));
            Assert.That(placedBeforeSave.durability, Is.EqualTo(100f));
            Assert.That(placedBeforeSave.resourceCostKey, Is.EqualTo("gate_material"));
            Assert.That(placedBeforeSave.resourceCostUnits, Is.EqualTo(3));
            Assert.That(placedBeforeSave.buildRequirementKey, Is.EqualTo("boundary_construction"));
            Assert.That(placedBeforeSave.buildRequirementSatisfied, Is.True);

            Assert.That(controller.SavePlacedPiecesToDisk(), Is.True);
            Assert.That(File.Exists(savePath), Is.True);
            var savedJson = File.ReadAllText(savePath);
            Assert.That(savedJson, Does.Contain("\"pieces\""));
            Assert.That(savedJson, Does.Contain("\"chunks\""));
            Assert.That(savedJson, Does.Contain("\"tiles\""));

            controller.ClearPlacedPieces();
            Assert.That(controller.PlacedPieceCount, Is.EqualTo(0));

            Assert.That(controller.LoadPlacedPiecesFromDisk(), Is.True);
            Assert.That(controller.TryGetTopPieceAtGlobalTile(globalTile, out var restored), Is.True);
            Assert.That(restored.pieceId, Is.EqualTo(ModularBuildPieceId.Gate.ToString()));
            Assert.That(restored.chunkX, Is.EqualTo(expectedChunk.x));
            Assert.That(restored.chunkY, Is.EqualTo(expectedChunk.y));
            Assert.That(restored.tileX, Is.EqualTo(expectedLocalTile.x));
            Assert.That(restored.tileY, Is.EqualTo(expectedLocalTile.y));
            Assert.That(restored.rotation, Is.EqualTo(270));
            Assert.That(restored.state, Is.EqualTo("built"));
            Assert.That(restored.durability, Is.EqualTo(100f));
            Assert.That(restored.resourceCostKey, Is.EqualTo("gate_material"));
            Assert.That(restored.resourceCostUnits, Is.EqualTo(3));
            Assert.That(restored.buildRequirementKey, Is.EqualTo("boundary_construction"));
            Assert.That(restored.buildRequirementSatisfied, Is.True);

            if (hadExistingSave)
            {
                File.Copy(backupPath, savePath, true);
                File.Delete(backupPath);
            }
            else if (File.Exists(savePath))
            {
                File.Delete(savePath);
            }
        }

        [UnityTest]
        public IEnumerator ModularConstructionPrototype_EnforcesOccupancyRulesAndPersistsValidRecords()
        {
            var savePath = ModularConstructionPrototypeController.GetSaveFilePath();
            var backupPath = savePath + ".playmode-backup";
            var hadExistingSave = File.Exists(savePath);

            if (hadExistingSave)
            {
                Directory.CreateDirectory(Path.GetDirectoryName(backupPath) ?? ".");
                File.Copy(savePath, backupPath, true);
                File.Delete(savePath);
            }

            yield return LoadScene(ModularConstructionScene);
            yield return WaitFrames(2);

            var controller = Object.FindFirstObjectByType<ModularConstructionPrototypeController>();
            Assert.That(controller, Is.Not.Null);
            controller.ClearPlacedPieces();

            var structuralTile = new Vector2Int(96, 96);
            var rotatedTile = new Vector2Int(104, 104);

            Assert.That(controller.TryPlacePieceAtGlobalTile(ModularBuildPieceId.FloorTile, structuralTile, 0), Is.True);
            Assert.That(controller.TryPlacePieceAtGlobalTile(ModularBuildPieceId.WallSegment, structuralTile, 0), Is.True);
            Assert.That(controller.TryPlacePieceAtGlobalTile(ModularBuildPieceId.FloorTile, structuralTile, 0), Is.False);
            Assert.That(controller.TryPlacePieceAtGlobalTile(ModularBuildPieceId.WindowWall, structuralTile, 0), Is.False);

            Assert.That(controller.TryPlacePieceAtGlobalTile(ModularBuildPieceId.Fence, rotatedTile, 450), Is.True);
            Assert.That(controller.TryGetTopPieceAtGlobalTile(rotatedTile, out var rotatedFence), Is.True);
            Assert.That(rotatedFence.pieceId, Is.EqualTo(ModularBuildPieceId.Fence.ToString()));
            Assert.That(rotatedFence.rotation, Is.EqualTo(90));

            Assert.That(controller.TryDismantleTopPieceAtGlobalTile(structuralTile), Is.True);
            Assert.That(controller.TryPlacePieceAtGlobalTile(ModularBuildPieceId.WindowWall, structuralTile, 0), Is.True);
            Assert.That(controller.TryGetTopPieceAtGlobalTile(structuralTile, out var replacementWall), Is.True);
            Assert.That(replacementWall.pieceId, Is.EqualTo(ModularBuildPieceId.WindowWall.ToString()));

            var countBeforeSave = controller.PlacedPieceCount;
            Assert.That(controller.SavePlacedPiecesToDisk(), Is.True);

            controller.ClearPlacedPieces();
            Assert.That(controller.PlacedPieceCount, Is.EqualTo(0));
            Assert.That(controller.LoadPlacedPiecesFromDisk(), Is.True);
            Assert.That(controller.PlacedPieceCount, Is.EqualTo(countBeforeSave));
            Assert.That(controller.TryGetTopPieceAtGlobalTile(structuralTile, out var restoredWall), Is.True);
            Assert.That(restoredWall.pieceId, Is.EqualTo(ModularBuildPieceId.WindowWall.ToString()));
            Assert.That(restoredWall.rotation, Is.EqualTo(0));
            Assert.That(restoredWall.state, Is.EqualTo("built"));
            Assert.That(restoredWall.durability, Is.EqualTo(100f));
            Assert.That(restoredWall.resourceCostKey, Is.EqualTo("wall_material"));
            Assert.That(restoredWall.resourceCostUnits, Is.EqualTo(4));
            Assert.That(restoredWall.buildRequirementKey, Is.EqualTo("opening_construction"));
            Assert.That(restoredWall.buildRequirementSatisfied, Is.True);
            Assert.That(controller.TryGetTopPieceAtGlobalTile(rotatedTile, out var restoredFence), Is.True);
            Assert.That(restoredFence.pieceId, Is.EqualTo(ModularBuildPieceId.Fence.ToString()));
            Assert.That(restoredFence.rotation, Is.EqualTo(90));
            Assert.That(restoredFence.resourceCostKey, Is.EqualTo("fence_material"));
            Assert.That(restoredFence.resourceCostUnits, Is.EqualTo(2));
            Assert.That(restoredFence.buildRequirementKey, Is.EqualTo("boundary_construction"));
            Assert.That(restoredFence.buildRequirementSatisfied, Is.True);

            if (hadExistingSave)
            {
                File.Copy(backupPath, savePath, true);
                File.Delete(backupPath);
            }
            else if (File.Exists(savePath))
            {
                File.Delete(savePath);
            }
        }

        [UnityTest]
        public IEnumerator ModularConstructionPrototype_CanDamageRepairDismantleAndPersistState()
        {
            var savePath = ModularConstructionPrototypeController.GetSaveFilePath();
            var backupPath = savePath + ".playmode-backup";
            var hadExistingSave = File.Exists(savePath);

            if (hadExistingSave)
            {
                Directory.CreateDirectory(Path.GetDirectoryName(backupPath) ?? ".");
                File.Copy(savePath, backupPath, true);
                File.Delete(savePath);
            }

            yield return LoadScene(ModularConstructionScene);
            yield return WaitFrames(2);

            var controller = Object.FindFirstObjectByType<ModularConstructionPrototypeController>();
            Assert.That(controller, Is.Not.Null);
            controller.ClearPlacedPieces();

            var globalTile = new Vector2Int(112, 112);
            Assert.That(controller.TryPlacePieceAtGlobalTile(ModularBuildPieceId.WallSegment, globalTile, 0), Is.True);
            Assert.That(controller.TryGetTopPieceAtGlobalTile(globalTile, out var built), Is.True);
            Assert.That(built.state, Is.EqualTo("built"));
            Assert.That(built.durability, Is.EqualTo(100f));

            Assert.That(controller.TryDamageTopPieceAtGlobalTile(globalTile, 35f), Is.True);
            Assert.That(controller.TryGetTopPieceAtGlobalTile(globalTile, out var damaged), Is.True);
            Assert.That(damaged.state, Is.EqualTo("damaged"));
            Assert.That(damaged.durability, Is.EqualTo(65f));

            Assert.That(controller.SavePlacedPiecesToDisk(), Is.True);
            controller.ClearPlacedPieces();
            Assert.That(controller.LoadPlacedPiecesFromDisk(), Is.True);
            Assert.That(controller.TryGetTopPieceAtGlobalTile(globalTile, out var restoredDamaged), Is.True);
            Assert.That(restoredDamaged.state, Is.EqualTo("damaged"));
            Assert.That(restoredDamaged.durability, Is.EqualTo(65f));

            Assert.That(controller.TryRepairTopPieceAtGlobalTile(globalTile), Is.True);
            Assert.That(controller.TryGetTopPieceAtGlobalTile(globalTile, out var repaired), Is.True);
            Assert.That(repaired.state, Is.EqualTo("repaired"));
            Assert.That(repaired.durability, Is.EqualTo(100f));

            Assert.That(controller.SavePlacedPiecesToDisk(), Is.True);
            controller.ClearPlacedPieces();
            Assert.That(controller.LoadPlacedPiecesFromDisk(), Is.True);
            Assert.That(controller.TryGetTopPieceAtGlobalTile(globalTile, out var restoredRepaired), Is.True);
            Assert.That(restoredRepaired.state, Is.EqualTo("repaired"));
            Assert.That(restoredRepaired.durability, Is.EqualTo(100f));

            Assert.That(controller.TryDismantleTopPieceAtGlobalTile(globalTile), Is.True);
            Assert.That(controller.PlacedPieceCount, Is.EqualTo(0));
            Assert.That(controller.TryGetTopPieceAtGlobalTile(globalTile, out _), Is.False);

            if (hadExistingSave)
            {
                File.Copy(backupPath, savePath, true);
                File.Delete(backupPath);
            }
            else if (File.Exists(savePath))
            {
                File.Delete(savePath);
            }
        }

        [UnityTest]
        public IEnumerator ModularConstructionPrototype_SkipsInvalidOverlapsDuringLoad()
        {
            var savePath = ModularConstructionPrototypeController.GetSaveFilePath();
            var backupPath = savePath + ".playmode-backup";
            var hadExistingSave = File.Exists(savePath);

            if (hadExistingSave)
            {
                Directory.CreateDirectory(Path.GetDirectoryName(backupPath) ?? ".");
                File.Copy(savePath, backupPath, true);
                File.Delete(savePath);
            }

            Directory.CreateDirectory(Path.GetDirectoryName(savePath) ?? ".");
            File.WriteAllText(
                savePath,
                @"{
  ""pieces"": [
    {
      ""recordId"": 1,
      ""pieceId"": ""FloorTile"",
      ""chunkX"": 4,
      ""chunkY"": 4,
      ""tileX"": 0,
      ""tileY"": 0,
      ""footprintWidthTiles"": 2,
      ""footprintDepthTiles"": 2,
      ""rotation"": 0,
      ""state"": ""intact""
    },
    {
      ""recordId"": 2,
      ""pieceId"": ""FloorTile"",
      ""chunkX"": 4,
      ""chunkY"": 4,
      ""tileX"": 0,
      ""tileY"": 0,
      ""footprintWidthTiles"": 2,
      ""footprintDepthTiles"": 2,
      ""rotation"": 0,
      ""state"": ""built"",
      ""durability"": 100.0
    }
  ]
}");

            yield return LoadScene(ModularConstructionScene);
            yield return WaitFrames(2);

            var controller = Object.FindFirstObjectByType<ModularConstructionPrototypeController>();
            Assert.That(controller, Is.Not.Null);
            Assert.That(controller.PlacedPieceCount, Is.EqualTo(1));
            Assert.That(controller.TryGetTopPieceAtGlobalTile(new Vector2Int(128, 128), out var restored), Is.True);
            Assert.That(restored.recordId, Is.EqualTo(1));
            Assert.That(restored.state, Is.EqualTo("built"));
            Assert.That(restored.durability, Is.EqualTo(100f));
            Assert.That(restored.resourceCostKey, Is.EqualTo("foundation_material"));
            Assert.That(restored.buildRequirementKey, Is.EqualTo("basic_construction"));

            if (hadExistingSave)
            {
                File.Copy(backupPath, savePath, true);
                File.Delete(backupPath);
            }
            else if (File.Exists(savePath))
            {
                File.Delete(savePath);
            }
        }

        [UnityTest]
        public IEnumerator LocalDevAutoEntry_ReachesPlayableField()
        {
            DeepStakeDevLaunchOptions.SetEditorOverrides(true, true, "playmode-autorun");
            yield return LoadScene(BootScene);
            yield return WaitForScene(WorldScene, 120);

            var world = Object.FindFirstObjectByType<WorldPrototype3DController>();
            Assert.That(SceneManager.GetActiveScene().name, Is.EqualTo(WorldScene));
            Assert.That(world, Is.Not.Null);
            Assert.That(world.PlayerTransform, Is.Not.Null);
            Assert.That(Object.FindFirstObjectByType<DeepStakeGameState>(), Is.Not.Null);
        }

        [UnityTest]
        public IEnumerator LocalSaveService_CanCreateSaveAndReload()
        {
            var savePath = LocalSaveService.GetSavePath();
            var backupPath = savePath + ".playmode-backup";
            var hadExistingSave = File.Exists(savePath);

            if (hadExistingSave)
            {
                Directory.CreateDirectory(Path.GetDirectoryName(backupPath) ?? Path.GetDirectoryName(savePath) ?? ".");
                File.Copy(savePath, backupPath, true);
            }

            try
            {
                var created = LocalSaveService.CreateDefault();
                created.LastStatus = "PlayMode test save";
                LocalSaveService.Save(created);

                var loaded = LocalSaveService.LoadOrCreate();
                Assert.That(File.Exists(savePath), Is.True);
                Assert.That(loaded, Is.Not.Null);
                Assert.That(loaded.CurrentZoneId, Is.EqualTo("recovery-field"));
                Assert.That(loaded.Player.MapId, Is.EqualTo("recovery-field"));
                Assert.That(loaded.LastStatus, Is.EqualTo("PlayMode test save"));
            }
            finally
            {
                if (hadExistingSave)
                {
                    File.Copy(backupPath, savePath, true);
                    File.Delete(backupPath);
                }
                else if (File.Exists(savePath))
                {
                    File.Delete(savePath);
                }
            }

            yield return null;
        }

        private static IEnumerator LoadScene(string sceneName)
        {
            var operation = SceneManager.LoadSceneAsync(sceneName, LoadSceneMode.Single);
            while (operation != null && !operation.isDone)
            {
                yield return null;
            }

            yield return null;
        }

        private static IEnumerator WaitForScene(string expectedSceneName, int maxFrames)
        {
            for (var frame = 0; frame < maxFrames; frame++)
            {
                if (SceneManager.GetActiveScene().name == expectedSceneName)
                {
                    yield break;
                }

                yield return null;
            }

            Assert.Fail("Timed out waiting for scene " + expectedSceneName + ". Active scene=" + SceneManager.GetActiveScene().name);
        }

        private static IEnumerator WaitFrames(int frameCount)
        {
            for (var index = 0; index < frameCount; index++)
            {
                yield return null;
            }
        }

        private static IEnumerator CleanupPersistentState()
        {
            var gameStates = Object.FindObjectsByType<DeepStakeGameState>(FindObjectsSortMode.None);
            for (var index = 0; index < gameStates.Length; index++)
            {
                Object.Destroy(gameStates[index].gameObject);
            }

            yield return null;
        }
    }
}
