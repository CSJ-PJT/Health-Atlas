using System;
using System.Collections.Generic;
using System.IO;
using UnityEngine;

namespace DeepStake.Construction
{
    public sealed class ModularConstructionPrototypeController : MonoBehaviour
    {
        private static readonly KeyCode[] PieceHotkeys =
        {
            KeyCode.Alpha1,
            KeyCode.Alpha2,
            KeyCode.Alpha3,
            KeyCode.Alpha4,
            KeyCode.Alpha5,
            KeyCode.Alpha6,
            KeyCode.Alpha7,
            KeyCode.Alpha8
        };

        [Header("World Scale")]
        [SerializeField] private float tileSizeMeters = 1f;
        [SerializeField] private int chunkSizeTiles = 32;
        [SerializeField] private float characterHeightMeters = 1.75f;

        [Header("Prototype")]
        [SerializeField] private bool spawnDemoFootprint = true;
        [SerializeField] private ModularBuildPieceId selectedPiece = ModularBuildPieceId.FloorTile;

        [SerializeField] private List<ModularConstructionChunk> chunkRecords = new List<ModularConstructionChunk>();

        private readonly List<PlacedBuildPiece> placedPieces = new List<PlacedBuildPiece>();
        private readonly Dictionary<Vector2Int, ModularConstructionChunk> chunks = new Dictionary<Vector2Int, ModularConstructionChunk>();
        private readonly Dictionary<int, GameObject> spawnedByRecordId = new Dictionary<int, GameObject>();
        private readonly Dictionary<ModularBuildPieceId, BuildPieceDefinition> definitions = new Dictionary<ModularBuildPieceId, BuildPieceDefinition>();

        private Material floorMaterial;
        private Material wallMaterial;
        private Material woodMaterial;
        private Material metalMaterial;
        private Material gridMaterial;
        private Material zoneMarkerMaterial;
        private Material validPreviewMaterial;
        private Material invalidPreviewMaterial;
        private Camera activeCamera;
        private GameObject previewInstance;
        private int rotationDegrees;
        private bool previewValid;
        private Vector2Int previewGlobalTile;
        private Vector2Int previewChunk;
        private Vector2Int previewLocalTile;
        private int nextRecordId = 1;
        private string persistenceStatus = "Persistence ready";

        public float TileSizeMeters
        {
            get { return tileSizeMeters; }
        }

        public int ChunkSizeTiles
        {
            get { return chunkSizeTiles; }
        }

        public IReadOnlyList<ModularConstructionChunk> ChunkRecords
        {
            get { return chunkRecords; }
        }

        public int PlacedPieceCount
        {
            get { return placedPieces.Count; }
        }

        public string SaveFilePath
        {
            get { return GetSaveFilePath(); }
        }

        private void Awake()
        {
            CreateMaterials();
            RegisterDefinitions();
            EnsureGround();
            EnsureZoneMarkers();
            EnsureScaleReferenceCharacter();
            EnsureCamera();
            EnsureLighting();

            if (!LoadPlacedPiecesFromDisk() && spawnDemoFootprint)
            {
                SpawnDemoBuilding();
            }
        }

        private void Update()
        {
            HandlePieceSelection();
            HandleRotation();
            HandlePersistenceInput();
            UpdatePreview();
            HandlePlacementInput();
        }

        private void OnGUI()
        {
            GUI.Box(new Rect(12, 12, 430, 136), "Modular Construction Prototype V1");
            GUI.Label(new Rect(24, 40, 390, 22), "1-8 select | [ ] cycle | R rotate | Left place | Right/Delete remove");
            GUI.Label(new Rect(24, 64, 390, 22), "Selected: " + selectedPiece + " | Rotation: " + rotationDegrees);
            GUI.Label(new Rect(24, 88, 390, 22), "Tile: " + previewGlobalTile + " | Chunk: " + previewChunk + " | Local: " + previewLocalTile);
            GUI.Label(new Rect(24, 112, 405, 22), "F5 save | F9 load | Placed=" + placedPieces.Count + " | " + persistenceStatus);
        }

        private void HandlePieceSelection()
        {
            for (var index = 0; index < PieceHotkeys.Length; index++)
            {
                if (UnityEngine.Input.GetKeyDown(PieceHotkeys[index]))
                {
                    selectedPiece = (ModularBuildPieceId)(index + 1);
                    RebuildPreview();
                }
            }

            if (UnityEngine.Input.GetKeyDown(KeyCode.LeftBracket))
            {
                selectedPiece = selectedPiece == ModularBuildPieceId.FloorTile
                    ? ModularBuildPieceId.Gate
                    : (ModularBuildPieceId)((int)selectedPiece - 1);
                RebuildPreview();
            }

            if (UnityEngine.Input.GetKeyDown(KeyCode.RightBracket))
            {
                selectedPiece = selectedPiece == ModularBuildPieceId.Gate
                    ? ModularBuildPieceId.FloorTile
                    : (ModularBuildPieceId)((int)selectedPiece + 1);
                RebuildPreview();
            }
        }

        private void HandleRotation()
        {
            if (!UnityEngine.Input.GetKeyDown(KeyCode.R))
            {
                return;
            }

            rotationDegrees = NormalizeRotation(rotationDegrees + 90);
            if (previewInstance != null)
            {
                previewInstance.transform.rotation = Quaternion.Euler(0f, rotationDegrees, 0f);
            }
        }

        private void HandlePersistenceInput()
        {
            if (UnityEngine.Input.GetKeyDown(KeyCode.F5))
            {
                SavePlacedPiecesToDisk();
            }

            if (UnityEngine.Input.GetKeyDown(KeyCode.F9))
            {
                LoadPlacedPiecesFromDisk();
            }
        }

        private void HandlePlacementInput()
        {
            if (UnityEngine.Input.GetMouseButtonDown(0) && previewValid)
            {
                TryPlacePieceAtGlobalTile(selectedPiece, previewGlobalTile, rotationDegrees);
            }

            if (UnityEngine.Input.GetMouseButtonDown(1) || UnityEngine.Input.GetKeyDown(KeyCode.Delete))
            {
                TryRemoveTopPieceAtGlobalTile(previewGlobalTile);
            }
        }

        private void UpdatePreview()
        {
            if (activeCamera == null)
            {
                activeCamera = Camera.main;
            }

            if (activeCamera == null)
            {
                return;
            }

            var ray = activeCamera.ScreenPointToRay(UnityEngine.Input.mousePosition);
            var groundPlane = new Plane(Vector3.up, Vector3.zero);
            if (!groundPlane.Raycast(ray, out var enter))
            {
                SetPreviewVisible(false);
                return;
            }

            var hit = ray.GetPoint(enter);
            previewGlobalTile = WorldToGlobalTile(hit);
            previewChunk = GlobalTileToChunk(previewGlobalTile);
            previewLocalTile = GlobalTileToLocalTile(previewGlobalTile, previewChunk);
            var rotatedFootprint = RotateFootprint(definitions[selectedPiece].footprintTiles, rotationDegrees);
            var worldPosition = TileFootprintToWorldCenter(previewGlobalTile, rotatedFootprint);
            previewValid = IsPlacementValid(selectedPiece, previewChunk, previewLocalTile, rotationDegrees);

            EnsurePreview();
            previewInstance.transform.position = worldPosition;
            previewInstance.transform.rotation = Quaternion.Euler(0f, rotationDegrees, 0f);
            ApplyMaterialRecursive(previewInstance, previewValid ? validPreviewMaterial : invalidPreviewMaterial);
            SetPreviewVisible(true);
        }

        public bool TryPlacePieceAtGlobalTile(ModularBuildPieceId pieceId, Vector2Int globalTile, int rotation)
        {
            var chunk = GlobalTileToChunk(globalTile);
            var localTile = GlobalTileToLocalTile(globalTile, chunk);
            var normalizedRotation = NormalizeRotation(rotation);
            if (!IsPlacementValid(pieceId, chunk, localTile, normalizedRotation))
            {
                return false;
            }

            var definition = definitions[pieceId];
            var record = new PlacedBuildPiece(nextRecordId++, pieceId, chunk, localTile, RotateFootprint(definition.footprintTiles, normalizedRotation), normalizedRotation);
            AddRecord(record);
            return true;
        }

        public bool TryRemoveTopPieceAtGlobalTile(Vector2Int globalTile)
        {
            var chunk = GlobalTileToChunk(globalTile);
            var localTile = GlobalTileToLocalTile(globalTile, chunk);
            return TryRemoveTopPieceAt(chunk, localTile);
        }

        public void ClearPlacedPieces()
        {
            foreach (var spawned in spawnedByRecordId.Values)
            {
                if (spawned != null)
                {
                    Destroy(spawned);
                }
            }

            spawnedByRecordId.Clear();
            placedPieces.Clear();
            chunks.Clear();
            chunkRecords.Clear();
            nextRecordId = 1;
        }

        public bool TryGetTopPieceAtGlobalTile(Vector2Int globalTile, out PlacedBuildPiece record)
        {
            var chunk = GlobalTileToChunk(globalTile);
            var localTile = GlobalTileToLocalTile(globalTile, chunk);
            if (chunks.TryGetValue(chunk, out var chunkData) &&
                chunkData.TryGetTile(localTile, out var tile) &&
                tile.pieces.Count > 0)
            {
                record = tile.pieces[tile.pieces.Count - 1];
                return true;
            }

            record = default;
            return false;
        }

        public bool SavePlacedPiecesToDisk()
        {
            try
            {
                var savePath = GetSaveFilePath();
                var directory = Path.GetDirectoryName(savePath);
                if (!string.IsNullOrEmpty(directory))
                {
                    Directory.CreateDirectory(directory);
                }

                var saveData = new ModularConstructionPrototypeSaveData
                {
                    pieces = new List<PlacedBuildPiece>(placedPieces)
                };

                File.WriteAllText(savePath, JsonUtility.ToJson(saveData, true));
                persistenceStatus = "Saved " + placedPieces.Count + " pieces";
                return true;
            }
            catch (Exception exception)
            {
                persistenceStatus = "Save failed: " + exception.GetType().Name;
                Debug.LogError("Failed to save modular construction prototype data: " + exception);
                return false;
            }
        }

        public bool LoadPlacedPiecesFromDisk()
        {
            var savePath = GetSaveFilePath();
            if (!File.Exists(savePath))
            {
                persistenceStatus = "No save file";
                return false;
            }

            try
            {
                var json = File.ReadAllText(savePath);
                var saveData = JsonUtility.FromJson<ModularConstructionPrototypeSaveData>(json);
                ClearPlacedPieces();

                var highestRecordId = 0;
                if (saveData != null && saveData.pieces != null)
                {
                    foreach (var savedRecord in saveData.pieces)
                    {
                        if (!Enum.TryParse(savedRecord.pieceId, out ModularBuildPieceId pieceId) ||
                            !definitions.TryGetValue(pieceId, out var definition))
                        {
                            continue;
                        }

                        var record = savedRecord;
                        if (record.recordId <= 0)
                        {
                            record.recordId = highestRecordId + 1;
                        }
                        record.rotation = NormalizeRotation(record.rotation);
                        if (record.footprintWidthTiles <= 0 || record.footprintDepthTiles <= 0)
                        {
                            var footprint = RotateFootprint(definition.footprintTiles, record.rotation);
                            record.footprintWidthTiles = footprint.x;
                            record.footprintDepthTiles = footprint.y;
                        }

                        if (string.IsNullOrEmpty(record.state))
                        {
                            record.state = "intact";
                        }

                        AddRecord(record);
                        highestRecordId = Mathf.Max(highestRecordId, record.recordId);
                    }
                }

                nextRecordId = highestRecordId + 1;
                persistenceStatus = "Loaded " + placedPieces.Count + " pieces";
                return true;
            }
            catch (Exception exception)
            {
                persistenceStatus = "Load failed: " + exception.GetType().Name;
                Debug.LogError("Failed to load modular construction prototype data: " + exception);
                return false;
            }
        }

        public static string GetSaveFilePath()
        {
            return Path.Combine(Application.persistentDataPath, "DeepStake3D", "modular-construction-prototype.json");
        }

        private bool TryRemoveTopPieceAt(Vector2Int chunk, Vector2Int localTile)
        {
            var chunkKey = chunk;
            if (!chunks.TryGetValue(chunkKey, out var chunkData) || !chunkData.TryGetTile(localTile, out var tile) || tile.pieces.Count == 0)
            {
                return false;
            }

            var record = tile.pieces[tile.pieces.Count - 1];

            RemoveRecordFromTiles(record);
            if (spawnedByRecordId.TryGetValue(record.recordId, out var spawned) && spawned != null)
            {
                Destroy(spawned);
            }

            spawnedByRecordId.Remove(record.recordId);
            return true;
        }

        private bool IsPlacementValid(ModularBuildPieceId pieceId, Vector2Int chunk, Vector2Int localTile, int rotation)
        {
            if (!definitions.TryGetValue(pieceId, out var definition))
            {
                return false;
            }

            foreach (var occupied in EnumerateOccupiedTiles(chunk, localTile, RotateFootprint(definition.footprintTiles, rotation)))
            {
                if (!chunks.TryGetValue(occupied.chunk, out var chunkData) || !chunkData.TryGetTile(occupied.localTile, out var tile))
                {
                    continue;
                }

                foreach (var record in tile.pieces)
                {
                    if (record.pieceId == pieceId.ToString())
                    {
                        return false;
                    }
                }
            }

            return true;
        }

        private void SpawnDemoBuilding()
        {
            // Scale Proof Zone: every major piece sits beside the 1.75m character reference.
            PlaceDemoPiece(ModularBuildPieceId.WallSegment, -8, 1, 0);
            PlaceDemoPiece(ModularBuildPieceId.DoorFrame, -6, 1, 0);
            PlaceDemoPiece(ModularBuildPieceId.Door, -6, 1, 0);
            PlaceDemoPiece(ModularBuildPieceId.WindowWall, -4, 1, 0);
            PlaceDemoPiece(ModularBuildPieceId.Fence, -8, -1, 0);
            PlaceDemoPiece(ModularBuildPieceId.Gate, -6, -1, 0);

            // Build Interaction Zone: mixed pieces and rotations show grid placement behavior.
            PlaceDemoPiece(ModularBuildPieceId.FloorTile, 0, 0, 0);
            PlaceDemoPiece(ModularBuildPieceId.FloorTile, 2, 0, 0);
            PlaceDemoPiece(ModularBuildPieceId.WallSegment, 0, 2, 0);
            PlaceDemoPiece(ModularBuildPieceId.WallSegment, 3, 0, 90);
            PlaceDemoPiece(ModularBuildPieceId.CornerWall, 3, 2, 90);
            PlaceDemoPiece(ModularBuildPieceId.WindowWall, 1, 3, 180);

            // Chunk Growth Zone: compact cluster that crosses beyond the origin chunk in tests.
            PlaceDemoPiece(ModularBuildPieceId.FloorTile, 8, 0, 0);
            PlaceDemoPiece(ModularBuildPieceId.DoorFrame, 8, 2, 180);
            PlaceDemoPiece(ModularBuildPieceId.Door, 8, 2, 180);
            PlaceDemoPiece(ModularBuildPieceId.Fence, 10, 0, 90);
            PlaceDemoPiece(ModularBuildPieceId.Gate, 10, 2, 90);

            selectedPiece = ModularBuildPieceId.FloorTile;
        }

        private void PlaceDemoPiece(ModularBuildPieceId pieceId, int tileX, int tileY, int rotation)
        {
            var globalTile = new Vector2Int(tileX, tileY);
            var chunk = GlobalTileToChunk(globalTile);
            var localTile = GlobalTileToLocalTile(globalTile, chunk);
            var definition = definitions[pieceId];
            var normalizedRotation = NormalizeRotation(rotation);
            var record = new PlacedBuildPiece(nextRecordId++, pieceId, chunk, localTile, RotateFootprint(definition.footprintTiles, normalizedRotation), normalizedRotation);
            AddRecord(record);
        }

        private void AddRecord(PlacedBuildPiece record)
        {
            var originChunk = new Vector2Int(record.chunkX, record.chunkY);
            var originLocalTile = new Vector2Int(record.tileX, record.tileY);
            var footprintTiles = new Vector2Int(record.footprintWidthTiles, record.footprintDepthTiles);
            foreach (var occupied in EnumerateOccupiedTiles(originChunk, originLocalTile, footprintTiles))
            {
                var chunkData = GetOrCreateChunk(occupied.chunk);
                var tile = chunkData.GetOrCreateTile(occupied.localTile);
                tile.pieces.Add(record);
            }

            placedPieces.Add(record);
            SpawnRecord(record);
        }

        private ModularConstructionChunk GetOrCreateChunk(Vector2Int chunk)
        {
            if (chunks.TryGetValue(chunk, out var chunkData))
            {
                return chunkData;
            }

            chunkData = new ModularConstructionChunk(chunk.x, chunk.y);
            chunks[chunk] = chunkData;
            chunkRecords.Add(chunkData);
            return chunkData;
        }

        private void RemoveFlatRecord(int recordId)
        {
            for (var index = placedPieces.Count - 1; index >= 0; index--)
            {
                if (placedPieces[index].recordId != recordId)
                {
                    continue;
                }

                placedPieces.RemoveAt(index);
                return;
            }
        }

        private void RemoveRecordFromTiles(PlacedBuildPiece record)
        {
            var originChunk = new Vector2Int(record.chunkX, record.chunkY);
            var originLocalTile = new Vector2Int(record.tileX, record.tileY);
            var footprintTiles = new Vector2Int(record.footprintWidthTiles, record.footprintDepthTiles);
            foreach (var occupied in EnumerateOccupiedTiles(originChunk, originLocalTile, footprintTiles))
            {
                if (!chunks.TryGetValue(occupied.chunk, out var chunkData) ||
                    !chunkData.TryGetTile(occupied.localTile, out var tile))
                {
                    continue;
                }

                for (var index = tile.pieces.Count - 1; index >= 0; index--)
                {
                    if (tile.pieces[index].recordId == record.recordId)
                    {
                        tile.pieces.RemoveAt(index);
                    }
                }

                chunkData.RemoveTileIfEmpty(occupied.localTile);
                if (!chunkData.HasTiles)
                {
                    chunks.Remove(occupied.chunk);
                    chunkRecords.Remove(chunkData);
                }
            }

            RemoveFlatRecord(record.recordId);
        }

        private void SpawnRecord(PlacedBuildPiece record)
        {
            if (!Enum.TryParse(record.pieceId, out ModularBuildPieceId pieceId) || !definitions.TryGetValue(pieceId, out var definition))
            {
                return;
            }

            var instance = new GameObject(record.pieceId + "_chunk_" + record.chunkX + "_" + record.chunkY + "_tile_" + record.tileX + "_" + record.tileY);
            var globalTile = new Vector2Int(
                record.chunkX * chunkSizeTiles + record.tileX,
                record.chunkY * chunkSizeTiles + record.tileY);
            var footprintTiles = new Vector2Int(record.footprintWidthTiles, record.footprintDepthTiles);
            instance.transform.position = TileFootprintToWorldCenter(globalTile, footprintTiles);
            instance.transform.rotation = Quaternion.Euler(0f, record.rotation, 0f);
            BuildVisual(instance.transform, definition, false);
            spawnedByRecordId[record.recordId] = instance;
        }

        private void EnsurePreview()
        {
            if (previewInstance != null && previewInstance.name.Contains(selectedPiece.ToString()))
            {
                return;
            }

            RebuildPreview();
        }

        private void RebuildPreview()
        {
            if (previewInstance != null)
            {
                Destroy(previewInstance);
            }

            if (!definitions.TryGetValue(selectedPiece, out var definition))
            {
                return;
            }

            previewInstance = new GameObject("Preview_" + selectedPiece);
            BuildVisual(previewInstance.transform, definition, true);
        }

        private void SetPreviewVisible(bool visible)
        {
            if (previewInstance != null)
            {
                previewInstance.SetActive(visible);
            }
        }

        private void BuildVisual(Transform parent, BuildPieceDefinition definition, bool preview)
        {
            foreach (var part in definition.parts)
            {
                var cube = GameObject.CreatePrimitive(PrimitiveType.Cube);
                cube.name = part.name;
                cube.transform.SetParent(parent, false);
                cube.transform.localPosition = part.localPosition;
                cube.transform.localScale = part.localScale;
                ApplyMaterialRecursive(cube, preview ? validPreviewMaterial : part.material);
            }
        }

        private void RegisterDefinitions()
        {
            definitions[ModularBuildPieceId.FloorTile] = new BuildPieceDefinition(
                new Vector2Int(2, 2),
                new BuildPart("2m_floor_tile", new Vector3(0f, 0.04f, 0f), new Vector3(2f, 0.08f, 2f), floorMaterial));

            definitions[ModularBuildPieceId.WallSegment] = new BuildPieceDefinition(
                new Vector2Int(2, 1),
                new BuildPart("2m_wall_segment_2_8m", new Vector3(0f, 1.4f, 0f), new Vector3(2f, 2.8f, 0.18f), wallMaterial));

            definitions[ModularBuildPieceId.CornerWall] = new BuildPieceDefinition(
                new Vector2Int(2, 2),
                new BuildPart("corner_wall_a", new Vector3(0f, 1.4f, 0f), new Vector3(2f, 2.8f, 0.18f), wallMaterial),
                new BuildPart("corner_wall_b", new Vector3(-0.91f, 1.4f, 0.91f), new Vector3(0.18f, 2.8f, 2f), wallMaterial));

            definitions[ModularBuildPieceId.DoorFrame] = new BuildPieceDefinition(
                new Vector2Int(2, 1),
                new BuildPart("door_left_post", new Vector3(-0.55f, 1.05f, 0f), new Vector3(0.16f, 2.1f, 0.2f), woodMaterial),
                new BuildPart("door_right_post", new Vector3(0.55f, 1.05f, 0f), new Vector3(0.16f, 2.1f, 0.2f), woodMaterial),
                new BuildPart("door_top_beam", new Vector3(0f, 2.18f, 0f), new Vector3(1.25f, 0.18f, 0.2f), woodMaterial));

            definitions[ModularBuildPieceId.Door] = new BuildPieceDefinition(
                new Vector2Int(1, 1),
                new BuildPart("0_9m_door_2_1m", new Vector3(0f, 1.05f, 0.03f), new Vector3(0.9f, 2.1f, 0.08f), woodMaterial));

            definitions[ModularBuildPieceId.WindowWall] = new BuildPieceDefinition(
                new Vector2Int(2, 1),
                new BuildPart("window_wall_left", new Vector3(-0.78f, 1.4f, 0f), new Vector3(0.44f, 2.8f, 0.18f), wallMaterial),
                new BuildPart("window_wall_right", new Vector3(0.78f, 1.4f, 0f), new Vector3(0.44f, 2.8f, 0.18f), wallMaterial),
                new BuildPart("window_wall_bottom", new Vector3(0f, 0.55f, 0f), new Vector3(1.12f, 1.1f, 0.18f), wallMaterial),
                new BuildPart("window_wall_top", new Vector3(0f, 2.35f, 0f), new Vector3(1.12f, 0.9f, 0.18f), wallMaterial),
                new BuildPart("dark_window_frame", new Vector3(0f, 1.48f, -0.02f), new Vector3(0.95f, 0.82f, 0.08f), metalMaterial));

            definitions[ModularBuildPieceId.Fence] = new BuildPieceDefinition(
                new Vector2Int(2, 1),
                new BuildPart("fence_post_left", new Vector3(-0.9f, 0.7f, 0f), new Vector3(0.12f, 1.4f, 0.12f), woodMaterial),
                new BuildPart("fence_post_right", new Vector3(0.9f, 0.7f, 0f), new Vector3(0.12f, 1.4f, 0.12f), woodMaterial),
                new BuildPart("fence_rail_top", new Vector3(0f, 1.05f, 0f), new Vector3(1.9f, 0.12f, 0.12f), woodMaterial),
                new BuildPart("fence_rail_mid", new Vector3(0f, 0.58f, 0f), new Vector3(1.9f, 0.12f, 0.12f), woodMaterial));

            definitions[ModularBuildPieceId.Gate] = new BuildPieceDefinition(
                new Vector2Int(2, 1),
                new BuildPart("gate_post_left", new Vector3(-0.95f, 0.8f, 0f), new Vector3(0.14f, 1.6f, 0.14f), woodMaterial),
                new BuildPart("gate_post_right", new Vector3(0.95f, 0.8f, 0f), new Vector3(0.14f, 1.6f, 0.14f), woodMaterial),
                new BuildPart("gate_panel", new Vector3(0f, 0.75f, 0.04f), new Vector3(1.55f, 1.1f, 0.1f), woodMaterial));
        }

        private IEnumerable<(Vector2Int chunk, Vector2Int localTile)> EnumerateOccupiedTiles(
            Vector2Int originChunk,
            Vector2Int originLocalTile,
            Vector2Int footprintTiles)
        {
            var originGlobalTile = new Vector2Int(
                originChunk.x * chunkSizeTiles + originLocalTile.x,
                originChunk.y * chunkSizeTiles + originLocalTile.y);

            for (var x = 0; x < Mathf.Max(1, footprintTiles.x); x++)
            {
                for (var y = 0; y < Mathf.Max(1, footprintTiles.y); y++)
                {
                    var globalTile = new Vector2Int(originGlobalTile.x + x, originGlobalTile.y + y);
                    var chunk = GlobalTileToChunk(globalTile);
                    yield return (chunk, GlobalTileToLocalTile(globalTile, chunk));
                }
            }
        }

        private Vector2Int WorldToGlobalTile(Vector3 world)
        {
            return new Vector2Int(
                Mathf.FloorToInt(world.x / tileSizeMeters),
                Mathf.FloorToInt(world.z / tileSizeMeters));
        }

        private Vector3 TileFootprintToWorldCenter(Vector2Int tile, Vector2Int footprintTiles)
        {
            var width = Mathf.Max(1, footprintTiles.x);
            var depth = Mathf.Max(1, footprintTiles.y);
            return new Vector3((tile.x + width * 0.5f) * tileSizeMeters, 0f, (tile.y + depth * 0.5f) * tileSizeMeters);
        }

        public Vector2Int GlobalTileToChunk(Vector2Int globalTile)
        {
            return new Vector2Int(
                Mathf.FloorToInt((float)globalTile.x / chunkSizeTiles),
                Mathf.FloorToInt((float)globalTile.y / chunkSizeTiles));
        }

        public Vector2Int GlobalTileToLocalTile(Vector2Int globalTile, Vector2Int chunk)
        {
            return new Vector2Int(
                globalTile.x - chunk.x * chunkSizeTiles,
                globalTile.y - chunk.y * chunkSizeTiles);
        }

        public static int NormalizeRotation(int degrees)
        {
            var snapped = Mathf.RoundToInt(degrees / 90f) * 90;
            snapped %= 360;
            return snapped < 0 ? snapped + 360 : snapped;
        }

        private static Vector2Int RotateFootprint(Vector2Int footprintTiles, int rotation)
        {
            var normalizedRotation = NormalizeRotation(rotation);
            return normalizedRotation == 90 || normalizedRotation == 270
                ? new Vector2Int(footprintTiles.y, footprintTiles.x)
                : footprintTiles;
        }

        private void EnsureGround()
        {
            var ground = GameObject.CreatePrimitive(PrimitiveType.Cube);
            ground.name = "Prototype_Ground_32m_Chunk";
            ground.transform.position = new Vector3(0f, -0.04f, 0f);
            ground.transform.localScale = new Vector3(32f, 0.08f, 32f);
            ApplyMaterialRecursive(ground, floorMaterial);
        }

        private void EnsureZoneMarkers()
        {
            CreateZoneMarker("Scale Proof Zone", new Vector3(-6f, 0.012f, 0.5f), new Vector3(5.8f, 0.02f, 4.8f));
            CreateZoneMarker("Build Interaction Zone", new Vector3(2f, 0.014f, 1.5f), new Vector3(5.8f, 0.02f, 5.8f));
            CreateZoneMarker("Chunk Growth Zone", new Vector3(9.5f, 0.016f, 1.5f), new Vector3(5.2f, 0.02f, 5.2f));

            CreateGridLines(-9, 12, -2, 5);
            CreateZoneLabel("SCALE PROOF\n1.75m character vs wall/door/window/fence", new Vector3(-6f, 0.05f, -2.25f));
            CreateZoneLabel("BUILD INTERACTION\nsnap grid + rotated pieces", new Vector3(2f, 0.05f, -2.25f));
            CreateZoneLabel("CHUNK DATA PROOF\nrecords drive runtime presentation", new Vector3(9.5f, 0.05f, -2.25f));
        }

        private void CreateZoneMarker(string name, Vector3 position, Vector3 scale)
        {
            var marker = GameObject.CreatePrimitive(PrimitiveType.Cube);
            marker.name = name + " Marker";
            marker.transform.position = position;
            marker.transform.localScale = scale;
            ApplyMaterialRecursive(marker, zoneMarkerMaterial);
        }

        private void CreateGridLines(int minX, int maxX, int minY, int maxY)
        {
            for (var x = minX; x <= maxX; x++)
            {
                var line = GameObject.CreatePrimitive(PrimitiveType.Cube);
                line.name = "Grid_X_" + x;
                line.transform.position = new Vector3(x, 0.03f, (minY + maxY + 1) * 0.5f);
                line.transform.localScale = new Vector3(0.025f, 0.025f, maxY - minY + 1);
                ApplyMaterialRecursive(line, gridMaterial);
            }

            for (var y = minY; y <= maxY; y++)
            {
                var line = GameObject.CreatePrimitive(PrimitiveType.Cube);
                line.name = "Grid_Y_" + y;
                line.transform.position = new Vector3((minX + maxX + 1) * 0.5f, 0.035f, y);
                line.transform.localScale = new Vector3(maxX - minX + 1, 0.025f, 0.025f);
                ApplyMaterialRecursive(line, gridMaterial);
            }
        }

        private void CreateZoneLabel(string text, Vector3 position)
        {
            var labelObject = new GameObject(text.Split('\n')[0] + " Label");
            labelObject.transform.position = position;
            labelObject.transform.rotation = Quaternion.Euler(70f, 0f, 0f);
            var label = labelObject.AddComponent<TextMesh>();
            label.text = text;
            label.anchor = TextAnchor.MiddleCenter;
            label.alignment = TextAlignment.Center;
            label.characterSize = 0.24f;
            label.fontSize = 42;
            label.color = new Color(0.86f, 0.82f, 0.68f, 1f);
        }

        private void EnsureScaleReferenceCharacter()
        {
            var player = GameObject.CreatePrimitive(PrimitiveType.Capsule);
            player.name = "ScaleReference_Player_1_75m";
            player.transform.position = new Vector3(-9f, characterHeightMeters * 0.5f, 1f);
            player.transform.localScale = new Vector3(0.42f, characterHeightMeters * 0.5f, 0.42f);
            ApplyMaterialRecursive(player, metalMaterial);
        }

        private void EnsureCamera()
        {
            activeCamera = Camera.main;
            if (activeCamera == null)
            {
                var cameraObject = new GameObject("Main Camera");
                activeCamera = cameraObject.AddComponent<Camera>();
                cameraObject.tag = "MainCamera";
            }

            activeCamera.transform.position = new Vector3(3f, 10.5f, -8.5f);
            activeCamera.transform.rotation = Quaternion.Euler(58f, -18f, 0f);
            activeCamera.orthographic = true;
            activeCamera.orthographicSize = 9f;
        }

        private static void EnsureLighting()
        {
            if (FindFirstObjectByType<Light>() != null)
            {
                return;
            }

            var lightObject = new GameObject("Prototype Directional Light");
            var light = lightObject.AddComponent<Light>();
            light.type = LightType.Directional;
            light.intensity = 1.25f;
            lightObject.transform.rotation = Quaternion.Euler(48f, -35f, 0f);
        }

        private void CreateMaterials()
        {
            floorMaterial = CreateMaterial("Dusty ground/floor", new Color(0.46f, 0.43f, 0.35f, 1f));
            wallMaterial = CreateMaterial("Muted concrete wall", new Color(0.58f, 0.58f, 0.50f, 1f));
            woodMaterial = CreateMaterial("Muted worn wood", new Color(0.32f, 0.22f, 0.15f, 1f));
            metalMaterial = CreateMaterial("Worn dark metal", new Color(0.18f, 0.22f, 0.23f, 1f));
            gridMaterial = CreateMaterial("Prototype grid line", new Color(0.20f, 0.24f, 0.24f, 1f));
            zoneMarkerMaterial = CreateMaterial("Proof zone muted marker", new Color(0.30f, 0.36f, 0.34f, 1f));
            validPreviewMaterial = CreateMaterial("Valid placement preview", new Color(0.25f, 0.65f, 0.42f, 0.45f));
            invalidPreviewMaterial = CreateMaterial("Invalid placement preview", new Color(0.75f, 0.18f, 0.12f, 0.45f));
        }

        private static Material CreateMaterial(string name, Color color)
        {
            var material = new Material(Shader.Find("Universal Render Pipeline/Lit") ?? Shader.Find("Standard"));
            material.name = name;
            material.color = color;
            return material;
        }

        private static void ApplyMaterialRecursive(GameObject root, Material material)
        {
            foreach (var renderer in root.GetComponentsInChildren<Renderer>(true))
            {
                renderer.sharedMaterial = material;
            }
        }

        private sealed class BuildPieceDefinition
        {
            public readonly Vector2Int footprintTiles;
            public readonly BuildPart[] parts;

            public BuildPieceDefinition(Vector2Int footprintTiles, params BuildPart[] parts)
            {
                this.footprintTiles = new Vector2Int(Mathf.Max(1, footprintTiles.x), Mathf.Max(1, footprintTiles.y));
                this.parts = parts;
            }
        }

        private sealed class BuildPart
        {
            public readonly string name;
            public readonly Vector3 localPosition;
            public readonly Vector3 localScale;
            public readonly Material material;

            public BuildPart(string name, Vector3 localPosition, Vector3 localScale, Material material)
            {
                this.name = name;
                this.localPosition = localPosition;
                this.localScale = localScale;
                this.material = material;
            }
        }

        [Serializable]
        private sealed class ModularConstructionPrototypeSaveData
        {
            public List<PlacedBuildPiece> pieces = new List<PlacedBuildPiece>();
        }
    }
}
