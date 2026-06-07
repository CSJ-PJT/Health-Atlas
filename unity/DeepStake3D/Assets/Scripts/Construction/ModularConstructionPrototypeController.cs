using System;
using System.Collections.Generic;
using System.IO;
using UnityEngine;

namespace DeepStake.Construction
{
    public sealed class ModularConstructionPrototypeController : MonoBehaviour
    {
        private const string StateBuilt = "built";
        private const string StateDamaged = "damaged";
        private const string StateRepaired = "repaired";
        private const float FullDurability = 100f;

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
        private ModularConstructionDataDiagnostics lastDiagnostics = new ModularConstructionDataDiagnostics();

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

        public ModularConstructionDataDiagnostics LastDiagnostics
        {
            get { return lastDiagnostics; }
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
            if (!CanPollLegacyInput())
            {
                return;
            }

            HandlePieceSelection();
            HandleRotation();
            HandlePersistenceInput();
            UpdatePreview();
            HandlePlacementInput();
        }

        private static bool CanPollLegacyInput()
        {
            if (Application.isBatchMode)
            {
                return false;
            }

#if ENABLE_INPUT_SYSTEM && !ENABLE_LEGACY_INPUT_MANAGER
            return false;
#else
            return true;
#endif
        }

        private void OnGUI()
        {
            GUI.Box(new Rect(12, 12, 430, 158), "Modular Construction Prototype V1");
            GUI.Label(new Rect(24, 40, 390, 22), "1-8 select | [ ] cycle | R rotate | Left place | Right/Delete dismantle");
            GUI.Label(new Rect(24, 64, 390, 22), "Selected: " + selectedPiece + " | Rotation: " + rotationDegrees);
            GUI.Label(new Rect(24, 88, 390, 22), "Tile: " + previewGlobalTile + " | Chunk: " + previewChunk + " | Local: " + previewLocalTile);
            GUI.Label(new Rect(24, 112, 405, 22), "Z damage | X repair | F5 save | F9 load");
            GUI.Label(new Rect(24, 136, 405, 22), "Placed=" + placedPieces.Count + " | " + persistenceStatus);
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
                TryDismantleTopPieceAtGlobalTile(previewGlobalTile);
            }

            if (UnityEngine.Input.GetKeyDown(KeyCode.Z))
            {
                TryDamageTopPieceAtGlobalTile(previewGlobalTile);
            }

            if (UnityEngine.Input.GetKeyDown(KeyCode.X))
            {
                TryRepairTopPieceAtGlobalTile(previewGlobalTile);
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
            var record = CreatePlacedBuildPiece(pieceId, chunk, localTile, normalizedRotation);
            AddRecord(record);
            return true;
        }

        public bool TryRemoveTopPieceAtGlobalTile(Vector2Int globalTile)
        {
            return TryDismantleTopPieceAtGlobalTile(globalTile);
        }

        public bool TryDismantleTopPieceAtGlobalTile(Vector2Int globalTile)
        {
            var chunk = GlobalTileToChunk(globalTile);
            var localTile = GlobalTileToLocalTile(globalTile, chunk);
            return TryDismantleTopPieceAt(chunk, localTile);
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

        public bool TryDamageTopPieceAtGlobalTile(Vector2Int globalTile, float durabilityLoss = 50f)
        {
            if (!TryGetTopPieceAtGlobalTile(globalTile, out var record))
            {
                return false;
            }

            var nextDurability = Mathf.Clamp(record.durability - Mathf.Max(0f, durabilityLoss), 0f, FullDurability);
            return UpdatePlacedPieceState(record.recordId, StateDamaged, nextDurability);
        }

        public bool TryRepairTopPieceAtGlobalTile(Vector2Int globalTile)
        {
            if (!TryGetTopPieceAtGlobalTile(globalTile, out var record))
            {
                return false;
            }

            return UpdatePlacedPieceState(record.recordId, StateRepaired, FullDurability);
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
                    pieces = new List<PlacedBuildPiece>(placedPieces),
                    chunks = new List<ModularConstructionChunk>(chunkRecords)
                };

                lastDiagnostics = ValidateConstructionData(saveData.pieces, saveData.chunks);
                if (lastDiagnostics.hasErrors)
                {
                    persistenceStatus = "Save blocked: " + lastDiagnostics.Summary;
                    Debug.LogError("Modular construction data failed validation before save: " + lastDiagnostics.Summary);
                    return false;
                }

                File.WriteAllText(savePath, JsonUtility.ToJson(saveData, true));
                persistenceStatus = "Saved " + placedPieces.Count + " pieces | " + lastDiagnostics.Summary;
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
                var skippedInvalidRecords = 0;
                var recordsToLoad = GetRecordsToLoad(saveData);
                if (recordsToLoad != null)
                {
                    foreach (var savedRecord in recordsToLoad)
                    {
                        if (!Enum.TryParse(savedRecord.pieceId, out ModularBuildPieceId pieceId) ||
                            !definitions.TryGetValue(pieceId, out var definition))
                        {
                            skippedInvalidRecords++;
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

                        if (string.IsNullOrEmpty(record.state) || record.state == "intact")
                        {
                            record.state = StateBuilt;
                        }

                        if (record.state == StateBuilt && record.durability <= 0f)
                        {
                            record.durability = FullDurability;
                        }
                        else
                        {
                            record.durability = Mathf.Clamp(record.durability, 0f, FullDurability);
                        }

                        if (string.IsNullOrEmpty(record.resourceCostKey))
                        {
                            record.resourceCostKey = definition.resourceCostKey;
                        }

                        if (record.resourceCostUnits <= 0)
                        {
                            record.resourceCostUnits = definition.resourceCostUnits;
                        }

                        if (string.IsNullOrEmpty(record.buildRequirementKey))
                        {
                            record.buildRequirementKey = definition.buildRequirementKey;
                            record.buildRequirementSatisfied = true;
                        }

                        highestRecordId = Mathf.Max(highestRecordId, record.recordId);
                        var recordChunk = new Vector2Int(record.chunkX, record.chunkY);
                        var recordLocalTile = new Vector2Int(record.tileX, record.tileY);
                        if (!IsRecordOriginInChunkBounds(record) || !IsPlacementValid(pieceId, recordChunk, recordLocalTile, record.rotation))
                        {
                            skippedInvalidRecords++;
                            continue;
                        }

                        AddRecord(record);
                    }
                }

                nextRecordId = highestRecordId + 1;
                lastDiagnostics = ValidateCurrentConstructionData();
                persistenceStatus = "Loaded " + placedPieces.Count + " pieces";
                if (skippedInvalidRecords > 0)
                {
                    persistenceStatus += " | skipped " + skippedInvalidRecords + " invalid";
                }

                persistenceStatus += " | " + lastDiagnostics.Summary;
                return true;
            }
            catch (Exception exception)
            {
                persistenceStatus = "Load failed: " + exception.GetType().Name;
                Debug.LogError("Failed to load modular construction prototype data: " + exception);
                return false;
            }
        }

        private static List<PlacedBuildPiece> GetRecordsToLoad(ModularConstructionPrototypeSaveData saveData)
        {
            if (saveData == null)
            {
                return null;
            }

            if (saveData.pieces != null && saveData.pieces.Count > 0)
            {
                return saveData.pieces;
            }

            if (saveData.chunks == null || saveData.chunks.Count == 0)
            {
                return null;
            }

            var records = new List<PlacedBuildPiece>();
            var seenRecordIds = new HashSet<int>();
            foreach (var chunk in saveData.chunks)
            {
                if (chunk == null || chunk.tiles == null)
                {
                    continue;
                }

                foreach (var tile in chunk.tiles)
                {
                    if (tile == null || tile.pieces == null)
                    {
                        continue;
                    }

                    foreach (var record in tile.pieces)
                    {
                        if (record.recordId > 0 && !seenRecordIds.Add(record.recordId))
                        {
                            continue;
                        }

                        records.Add(record);
                    }
                }
            }

            return records;
        }

        public ModularConstructionDataDiagnostics ValidateCurrentConstructionData()
        {
            return ValidateConstructionData(placedPieces, chunkRecords);
        }

        public bool TryGetChunkSnapshot(Vector2Int chunk, out ModularConstructionChunk snapshot)
        {
            if (!chunks.TryGetValue(chunk, out var source))
            {
                snapshot = null;
                return false;
            }

            snapshot = CloneChunk(source);
            return true;
        }

        public bool TryApplyChunkSnapshot(ModularConstructionChunk snapshot)
        {
            if (snapshot == null)
            {
                return false;
            }

            var incoming = CloneChunk(snapshot);
            var importDiagnostics = ValidateConstructionData(null, new List<ModularConstructionChunk> { incoming });
            if (importDiagnostics.invalidChunkTiles > 0 || importDiagnostics.outOfRangeTileReferences > 0)
            {
                lastDiagnostics = importDiagnostics;
                return false;
            }

            var chunkKey = new Vector2Int(incoming.chunkX, incoming.chunkY);
            RemoveChunkRecords(chunkKey);

            var records = GetRecordsToLoad(new ModularConstructionPrototypeSaveData
            {
                chunks = new List<ModularConstructionChunk> { incoming }
            });

            if (records == null)
            {
                lastDiagnostics = ValidateCurrentConstructionData();
                return true;
            }

            var loadedAny = false;
            foreach (var record in records)
            {
                if (!Enum.TryParse(record.pieceId, out ModularBuildPieceId pieceId) ||
                    !definitions.TryGetValue(pieceId, out _) ||
                    !IsRecordOriginInChunkBounds(record) ||
                    !IsPlacementValid(pieceId, new Vector2Int(record.chunkX, record.chunkY), new Vector2Int(record.tileX, record.tileY), NormalizeRotation(record.rotation)))
                {
                    continue;
                }

                AddRecord(NormalizeLoadedRecord(record, pieceId));
                nextRecordId = Mathf.Max(nextRecordId, record.recordId + 1);
                loadedAny = true;
            }

            lastDiagnostics = ValidateCurrentConstructionData();
            return loadedAny;
        }

        public List<Vector2Int> GetOccupiedChunkCoordinates()
        {
            var coordinates = new List<Vector2Int>(chunks.Keys);
            coordinates.Sort(CompareChunkCoordinates);
            return coordinates;
        }

        public List<ModularConstructionChunk> GetChunkSnapshotsInRange(Vector2Int minChunk, Vector2Int maxChunk)
        {
            var normalizedMin = new Vector2Int(Mathf.Min(minChunk.x, maxChunk.x), Mathf.Min(minChunk.y, maxChunk.y));
            var normalizedMax = new Vector2Int(Mathf.Max(minChunk.x, maxChunk.x), Mathf.Max(minChunk.y, maxChunk.y));
            var snapshots = new List<ModularConstructionChunk>();

            foreach (var chunk in GetOccupiedChunkCoordinates())
            {
                if (chunk.x < normalizedMin.x ||
                    chunk.y < normalizedMin.y ||
                    chunk.x > normalizedMax.x ||
                    chunk.y > normalizedMax.y)
                {
                    continue;
                }

                if (TryGetChunkSnapshot(chunk, out var snapshot))
                {
                    snapshots.Add(snapshot);
                }
            }

            return snapshots;
        }

        public List<PlacedBuildPiece> GetRecordsTouchingChunk(Vector2Int chunk)
        {
            var records = new List<PlacedBuildPiece>();
            if (!chunks.TryGetValue(chunk, out var chunkData))
            {
                return records;
            }

            var seenRecordIds = new HashSet<int>();
            foreach (var tile in chunkData.tiles)
            {
                if (tile?.pieces == null)
                {
                    continue;
                }

                foreach (var record in tile.pieces)
                {
                    if (record.recordId > 0 && !seenRecordIds.Add(record.recordId))
                    {
                        continue;
                    }

                    records.Add(record);
                }
            }

            records.Sort(ComparePlacedRecords);
            return records;
        }

        public List<ModularConstructionChunkRecordGroup> BuildChunkRecordGroups()
        {
            var groups = new List<ModularConstructionChunkRecordGroup>();
            foreach (var chunk in GetOccupiedChunkCoordinates())
            {
                var group = new ModularConstructionChunkRecordGroup(chunk.x, chunk.y);
                foreach (var record in GetRecordsTouchingChunk(chunk))
                {
                    group.records.Add(record);
                    if (record.chunkX == chunk.x && record.chunkY == chunk.y)
                    {
                        group.originRecords.Add(record);
                    }
                    else
                    {
                        group.boundaryRecords.Add(record);
                    }
                }

                groups.Add(group);
            }

            return groups;
        }

        public ModularConstructionWorldChunkSummary BuildChunkWorldSummary()
        {
            var summary = new ModularConstructionWorldChunkSummary();
            var diagnostics = ValidateCurrentConstructionData();
            summary.hasErrors = diagnostics.hasErrors;
            summary.diagnosticsSummary = diagnostics.Summary;

            var occupiedChunks = GetOccupiedChunkCoordinates();
            summary.chunkCount = occupiedChunks.Count;
            summary.tileCount = diagnostics.tileCount;
            summary.pieceReferences = diagnostics.chunkPieceReferences;
            summary.uniqueRecordCount = placedPieces.Count;

            if (occupiedChunks.Count > 0)
            {
                summary.minChunkX = occupiedChunks[0].x;
                summary.maxChunkX = occupiedChunks[0].x;
                summary.minChunkY = occupiedChunks[0].y;
                summary.maxChunkY = occupiedChunks[0].y;
            }

            var boundarySpanningRecordIds = new HashSet<int>();
            foreach (var chunk in occupiedChunks)
            {
                summary.minChunkX = Mathf.Min(summary.minChunkX, chunk.x);
                summary.maxChunkX = Mathf.Max(summary.maxChunkX, chunk.x);
                summary.minChunkY = Mathf.Min(summary.minChunkY, chunk.y);
                summary.maxChunkY = Mathf.Max(summary.maxChunkY, chunk.y);

                if (!chunks.TryGetValue(chunk, out var chunkData))
                {
                    continue;
                }

                var chunkRecordIds = new HashSet<int>();
                var pieceReferences = 0;
                var boundaryReferences = 0;
                foreach (var tile in chunkData.tiles)
                {
                    if (tile?.pieces == null)
                    {
                        continue;
                    }

                    pieceReferences += tile.pieces.Count;
                    foreach (var record in tile.pieces)
                    {
                        if (record.recordId > 0)
                        {
                            chunkRecordIds.Add(record.recordId);
                        }

                        if (RecordSpansMultipleChunks(record))
                        {
                            boundarySpanningRecordIds.Add(record.recordId);
                        }

                        if (record.chunkX != chunk.x || record.chunkY != chunk.y)
                        {
                            boundaryReferences++;
                        }
                    }
                }

                summary.chunks.Add(new ModularConstructionChunkSummary(
                    chunk.x,
                    chunk.y,
                    chunkData.tiles.Count,
                    pieceReferences,
                    chunkRecordIds.Count,
                    boundaryReferences));
            }

            summary.boundarySpanningRecordCount = boundarySpanningRecordIds.Count;
            return summary;
        }

        public bool BuildSettlementScaleValidationScenario()
        {
            ClearPlacedPieces();

            var allPlaced = true;
            allPlaced &= BuildScenarioHouse(new Vector2Int(28, 0));
            allPlaced &= BuildScenarioHouse(new Vector2Int(34, 34));
            allPlaced &= BuildScenarioHouse(new Vector2Int(-2, 30));

            for (var x = 24; x <= 38; x += 2)
            {
                allPlaced &= TryPlacePieceAtGlobalTile(ModularBuildPieceId.FloorTile, new Vector2Int(x, 31), 0);
            }

            for (var y = -2; y <= 38; y += 2)
            {
                allPlaced &= TryPlacePieceAtGlobalTile(ModularBuildPieceId.Fence, new Vector2Int(24, y), 90);
                allPlaced &= TryPlacePieceAtGlobalTile(ModularBuildPieceId.Fence, new Vector2Int(40, y), 90);
            }

            for (var x = 26; x <= 38; x += 2)
            {
                if (x == 32)
                {
                    allPlaced &= TryPlacePieceAtGlobalTile(ModularBuildPieceId.Gate, new Vector2Int(x, -3), 0);
                    continue;
                }

                allPlaced &= TryPlacePieceAtGlobalTile(ModularBuildPieceId.Fence, new Vector2Int(x, -3), 0);
            }

            for (var x = 26; x <= 38; x += 2)
            {
                allPlaced &= TryPlacePieceAtGlobalTile(ModularBuildPieceId.Fence, new Vector2Int(x, 40), 0);
            }

            lastDiagnostics = ValidateCurrentConstructionData();
            persistenceStatus = "Settlement validation scenario " + (allPlaced && !lastDiagnostics.hasErrors ? "ready" : "invalid") + " | " + lastDiagnostics.Summary;
            return allPlaced && !lastDiagnostics.hasErrors;
        }

        public bool BuildRegionalChunkWorldValidationScenario()
        {
            ClearPlacedPieces();

            var allPlaced = true;
            allPlaced &= BuildSettlementCluster(new Vector2Int(28, 0));
            allPlaced &= BuildSettlementCluster(new Vector2Int(66, 66));
            allPlaced &= BuildSettlementCluster(new Vector2Int(-34, 62));
            allPlaced &= BuildSettlementCluster(new Vector2Int(94, -34));
            allPlaced &= BuildSettlementCluster(new Vector2Int(-66, -34));

            for (var x = -32; x <= 96; x += 8)
            {
                TryPlacePieceAtGlobalTile(ModularBuildPieceId.FloorTile, new Vector2Int(x, 31), 0);
            }

            for (var y = -32; y <= 96; y += 8)
            {
                TryPlacePieceAtGlobalTile(ModularBuildPieceId.FloorTile, new Vector2Int(31, y), 0);
            }

            lastDiagnostics = ValidateCurrentConstructionData();
            var chunkSummary = BuildChunkWorldSummary();
            persistenceStatus = "Regional chunk world scenario " + (allPlaced && !lastDiagnostics.hasErrors ? "ready" : "invalid") + " | " + chunkSummary.Summary;
            return allPlaced && !lastDiagnostics.hasErrors;
        }

        public static string GetSaveFilePath()
        {
            return Path.Combine(Application.persistentDataPath, "DeepStake3D", "modular-construction-prototype.json");
        }

        private PlacedBuildPiece NormalizeLoadedRecord(PlacedBuildPiece savedRecord, ModularBuildPieceId pieceId)
        {
            var definition = definitions[pieceId];
            var record = savedRecord;
            if (record.recordId <= 0)
            {
                record.recordId = nextRecordId++;
            }

            record.rotation = NormalizeRotation(record.rotation);
            if (record.footprintWidthTiles <= 0 || record.footprintDepthTiles <= 0)
            {
                var footprint = RotateFootprint(definition.footprintTiles, record.rotation);
                record.footprintWidthTiles = footprint.x;
                record.footprintDepthTiles = footprint.y;
            }

            if (string.IsNullOrEmpty(record.state) || record.state == "intact")
            {
                record.state = StateBuilt;
            }

            if (record.state == StateBuilt && record.durability <= 0f)
            {
                record.durability = FullDurability;
            }
            else
            {
                record.durability = Mathf.Clamp(record.durability, 0f, FullDurability);
            }

            if (string.IsNullOrEmpty(record.resourceCostKey))
            {
                record.resourceCostKey = definition.resourceCostKey;
            }

            if (record.resourceCostUnits <= 0)
            {
                record.resourceCostUnits = definition.resourceCostUnits;
            }

            if (string.IsNullOrEmpty(record.buildRequirementKey))
            {
                record.buildRequirementKey = definition.buildRequirementKey;
                record.buildRequirementSatisfied = true;
            }

            return record;
        }

        private ModularConstructionDataDiagnostics ValidateConstructionData(
            IReadOnlyList<PlacedBuildPiece> sourceRecords,
            IReadOnlyList<ModularConstructionChunk> chunkData)
        {
            var diagnostics = new ModularConstructionDataDiagnostics();
            var sourceIds = new HashSet<int>();
            var duplicateIds = new HashSet<int>();
            if (sourceRecords != null)
            {
                diagnostics.sourceRecordCount = sourceRecords.Count;
                foreach (var record in sourceRecords)
                {
                    if (record.recordId > 0 && !sourceIds.Add(record.recordId))
                    {
                        duplicateIds.Add(record.recordId);
                    }

                    if (!IsRecordOriginInChunkBounds(record))
                    {
                        diagnostics.outOfRangeTileReferences++;
                    }
                }
            }

            diagnostics.duplicateRecordIds = duplicateIds.Count;

            if (chunkData != null)
            {
                diagnostics.chunkCount = chunkData.Count;
                foreach (var chunk in chunkData)
                {
                    if (chunk == null || chunk.tiles == null)
                    {
                        continue;
                    }

                    diagnostics.tileCount += chunk.tiles.Count;
                    foreach (var tile in chunk.tiles)
                    {
                        if (tile == null)
                        {
                            diagnostics.invalidChunkTiles++;
                            continue;
                        }

                        var localTile = new Vector2Int(tile.tileX, tile.tileY);
                        if (!IsLocalTileInChunkBounds(localTile))
                        {
                            diagnostics.invalidChunkTiles++;
                        }

                        if (tile.pieces == null)
                        {
                            continue;
                        }

                        foreach (var record in tile.pieces)
                        {
                            diagnostics.chunkPieceReferences++;
                            if (!IsRecordOriginInChunkBounds(record))
                            {
                                diagnostics.outOfRangeTileReferences++;
                            }

                            if (sourceRecords != null && record.recordId > 0 && !sourceIds.Contains(record.recordId))
                            {
                                diagnostics.orphanedChunkReferences++;
                            }

                            var occupied = DoesRecordOccupyChunkTile(record, chunk, localTile);
                            if (!occupied)
                            {
                                diagnostics.missingChunkReferences++;
                            }
                        }
                    }
                }
            }

            diagnostics.hasErrors = diagnostics.duplicateRecordIds > 0 ||
                diagnostics.invalidChunkTiles > 0 ||
                diagnostics.outOfRangeTileReferences > 0 ||
                diagnostics.missingChunkReferences > 0 ||
                diagnostics.orphanedChunkReferences > 0;
            return diagnostics;
        }

        private bool DoesRecordOccupyChunkTile(PlacedBuildPiece record, ModularConstructionChunk chunk, Vector2Int localTile)
        {
            var originChunk = new Vector2Int(record.chunkX, record.chunkY);
            var originLocalTile = new Vector2Int(record.tileX, record.tileY);
            var footprintTiles = new Vector2Int(record.footprintWidthTiles, record.footprintDepthTiles);
            foreach (var occupied in EnumerateOccupiedTiles(originChunk, originLocalTile, footprintTiles))
            {
                if (occupied.chunk.x == chunk.chunkX &&
                    occupied.chunk.y == chunk.chunkY &&
                    occupied.localTile == localTile)
                {
                    return true;
                }
            }

            return false;
        }

        private bool RecordSpansMultipleChunks(PlacedBuildPiece record)
        {
            var originChunk = new Vector2Int(record.chunkX, record.chunkY);
            var originLocalTile = new Vector2Int(record.tileX, record.tileY);
            var footprintTiles = new Vector2Int(record.footprintWidthTiles, record.footprintDepthTiles);
            foreach (var occupied in EnumerateOccupiedTiles(originChunk, originLocalTile, footprintTiles))
            {
                if (occupied.chunk != originChunk)
                {
                    return true;
                }
            }

            return false;
        }

        private bool IsRecordOriginInChunkBounds(PlacedBuildPiece record)
        {
            return IsLocalTileInChunkBounds(new Vector2Int(record.tileX, record.tileY));
        }

        private bool IsLocalTileInChunkBounds(Vector2Int localTile)
        {
            return localTile.x >= 0 &&
                localTile.y >= 0 &&
                localTile.x < chunkSizeTiles &&
                localTile.y < chunkSizeTiles;
        }

        private static ModularConstructionChunk CloneChunk(ModularConstructionChunk source)
        {
            var clone = new ModularConstructionChunk(source.chunkX, source.chunkY);
            if (source.tiles == null)
            {
                return clone;
            }

            foreach (var tile in source.tiles)
            {
                if (tile == null)
                {
                    continue;
                }

                var cloneTile = new ModularConstructionTile(tile.tileX, tile.tileY);
                if (tile.pieces != null)
                {
                    cloneTile.pieces.AddRange(tile.pieces);
                }

                clone.tiles.Add(cloneTile);
            }

            return clone;
        }

        private static int CompareChunkCoordinates(Vector2Int left, Vector2Int right)
        {
            var yComparison = left.y.CompareTo(right.y);
            return yComparison != 0 ? yComparison : left.x.CompareTo(right.x);
        }

        private static int ComparePlacedRecords(PlacedBuildPiece left, PlacedBuildPiece right)
        {
            var recordComparison = left.recordId.CompareTo(right.recordId);
            if (recordComparison != 0)
            {
                return recordComparison;
            }

            var chunkComparison = left.chunkY.CompareTo(right.chunkY);
            if (chunkComparison != 0)
            {
                return chunkComparison;
            }

            chunkComparison = left.chunkX.CompareTo(right.chunkX);
            if (chunkComparison != 0)
            {
                return chunkComparison;
            }

            var tileComparison = left.tileY.CompareTo(right.tileY);
            return tileComparison != 0 ? tileComparison : left.tileX.CompareTo(right.tileX);
        }

        private void RemoveChunkRecords(Vector2Int chunkKey)
        {
            for (var index = placedPieces.Count - 1; index >= 0; index--)
            {
                var record = placedPieces[index];
                var touchesChunk = false;
                foreach (var occupied in EnumerateOccupiedTiles(
                    new Vector2Int(record.chunkX, record.chunkY),
                    new Vector2Int(record.tileX, record.tileY),
                    new Vector2Int(record.footprintWidthTiles, record.footprintDepthTiles)))
                {
                    if (occupied.chunk == chunkKey)
                    {
                        touchesChunk = true;
                        break;
                    }
                }

                if (!touchesChunk)
                {
                    continue;
                }

                RemoveRecordFromTiles(record);
                if (spawnedByRecordId.TryGetValue(record.recordId, out var spawned) && spawned != null)
                {
                    Destroy(spawned);
                }

                spawnedByRecordId.Remove(record.recordId);
            }
        }

        private bool TryDismantleTopPieceAt(Vector2Int chunk, Vector2Int localTile)
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

        private bool UpdatePlacedPieceState(int recordId, string state, float durability)
        {
            var found = false;
            var clampedDurability = Mathf.Clamp(durability, 0f, FullDurability);

            for (var index = 0; index < placedPieces.Count; index++)
            {
                if (placedPieces[index].recordId != recordId)
                {
                    continue;
                }

                var updated = placedPieces[index];
                updated.state = state;
                updated.durability = clampedDurability;
                placedPieces[index] = updated;
                found = true;
                break;
            }

            foreach (var chunk in chunkRecords)
            {
                foreach (var tile in chunk.tiles)
                {
                    for (var index = 0; index < tile.pieces.Count; index++)
                    {
                        if (tile.pieces[index].recordId != recordId)
                        {
                            continue;
                        }

                        var updated = tile.pieces[index];
                        updated.state = state;
                        updated.durability = clampedDurability;
                        tile.pieces[index] = updated;
                        found = true;
                    }
                }
            }

            return found;
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
                    if (!CanPiecesCoexist(definition, record))
                    {
                        return false;
                    }
                }
            }

            return true;
        }

        private bool BuildScenarioHouse(Vector2Int origin)
        {
            var placed = true;

            placed &= TryPlacePieceAtGlobalTile(ModularBuildPieceId.FloorTile, origin, 0);
            placed &= TryPlacePieceAtGlobalTile(ModularBuildPieceId.FloorTile, origin + new Vector2Int(2, 0), 0);
            placed &= TryPlacePieceAtGlobalTile(ModularBuildPieceId.FloorTile, origin + new Vector2Int(0, 2), 0);
            placed &= TryPlacePieceAtGlobalTile(ModularBuildPieceId.FloorTile, origin + new Vector2Int(2, 2), 0);

            placed &= TryPlacePieceAtGlobalTile(ModularBuildPieceId.WindowWall, origin + new Vector2Int(0, 4), 0);
            placed &= TryPlacePieceAtGlobalTile(ModularBuildPieceId.WallSegment, origin + new Vector2Int(2, 4), 0);
            placed &= TryPlacePieceAtGlobalTile(ModularBuildPieceId.WallSegment, origin + new Vector2Int(0, -1), 0);
            placed &= TryPlacePieceAtGlobalTile(ModularBuildPieceId.DoorFrame, origin + new Vector2Int(2, -1), 0);
            placed &= TryPlacePieceAtGlobalTile(ModularBuildPieceId.Door, origin + new Vector2Int(2, -1), 0);
            placed &= TryPlacePieceAtGlobalTile(ModularBuildPieceId.CornerWall, origin + new Vector2Int(4, 0), 90);
            placed &= TryPlacePieceAtGlobalTile(ModularBuildPieceId.WallSegment, origin + new Vector2Int(4, 2), 90);
            placed &= TryPlacePieceAtGlobalTile(ModularBuildPieceId.WallSegment, origin + new Vector2Int(-1, 0), 90);
            placed &= TryPlacePieceAtGlobalTile(ModularBuildPieceId.WindowWall, origin + new Vector2Int(-1, 2), 90);

            return placed;
        }

        private bool BuildSettlementCluster(Vector2Int origin)
        {
            var placed = true;
            placed &= BuildScenarioHouse(origin);
            placed &= BuildScenarioHouse(origin + new Vector2Int(8, 8));

            for (var x = origin.x - 6; x <= origin.x + 20; x += 4)
            {
                TryPlacePieceAtGlobalTile(ModularBuildPieceId.FloorTile, new Vector2Int(x, origin.y + 6), 0);
            }

            for (var y = origin.y - 6; y <= origin.y + 20; y += 4)
            {
                TryPlacePieceAtGlobalTile(ModularBuildPieceId.FloorTile, new Vector2Int(origin.x + 6, y), 0);
            }

            return placed;
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
            var normalizedRotation = NormalizeRotation(rotation);
            var record = CreatePlacedBuildPiece(pieceId, chunk, localTile, normalizedRotation);
            AddRecord(record);
        }

        private PlacedBuildPiece CreatePlacedBuildPiece(
            ModularBuildPieceId pieceId,
            Vector2Int chunk,
            Vector2Int localTile,
            int normalizedRotation)
        {
            var definition = definitions[pieceId];
            return new PlacedBuildPiece(
                nextRecordId++,
                pieceId,
                chunk,
                localTile,
                RotateFootprint(definition.footprintTiles, normalizedRotation),
                normalizedRotation,
                StateBuilt,
                FullDurability,
                definition.resourceCostKey,
                definition.resourceCostUnits,
                definition.buildRequirementKey,
                true);
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
                BuildPieceCategory.Floor,
                new Vector2Int(2, 2),
                "foundation_material",
                2,
                "basic_construction",
                new BuildPart("2m_floor_tile", new Vector3(0f, 0.04f, 0f), new Vector3(2f, 0.08f, 2f), floorMaterial));

            definitions[ModularBuildPieceId.WallSegment] = new BuildPieceDefinition(
                BuildPieceCategory.Wall,
                new Vector2Int(2, 1),
                "wall_material",
                3,
                "basic_construction",
                new BuildPart("2m_wall_segment_2_8m", new Vector3(0f, 1.4f, 0f), new Vector3(2f, 2.8f, 0.18f), wallMaterial));

            definitions[ModularBuildPieceId.CornerWall] = new BuildPieceDefinition(
                BuildPieceCategory.Wall,
                new Vector2Int(2, 2),
                "wall_material",
                5,
                "basic_construction",
                new BuildPart("corner_wall_a", new Vector3(0f, 1.4f, 0f), new Vector3(2f, 2.8f, 0.18f), wallMaterial),
                new BuildPart("corner_wall_b", new Vector3(-0.91f, 1.4f, 0.91f), new Vector3(0.18f, 2.8f, 2f), wallMaterial));

            definitions[ModularBuildPieceId.DoorFrame] = new BuildPieceDefinition(
                BuildPieceCategory.Opening,
                new Vector2Int(2, 1),
                "framing_material",
                2,
                "opening_construction",
                new BuildPart("door_left_post", new Vector3(-0.55f, 1.05f, 0f), new Vector3(0.16f, 2.1f, 0.2f), woodMaterial),
                new BuildPart("door_right_post", new Vector3(0.55f, 1.05f, 0f), new Vector3(0.16f, 2.1f, 0.2f), woodMaterial),
                new BuildPart("door_top_beam", new Vector3(0f, 2.18f, 0f), new Vector3(1.25f, 0.18f, 0.2f), woodMaterial));

            definitions[ModularBuildPieceId.Door] = new BuildPieceDefinition(
                BuildPieceCategory.Door,
                new Vector2Int(1, 1),
                "door_material",
                1,
                "opening_construction",
                new BuildPart("0_9m_door_2_1m", new Vector3(0f, 1.05f, 0.03f), new Vector3(0.9f, 2.1f, 0.08f), woodMaterial));

            definitions[ModularBuildPieceId.WindowWall] = new BuildPieceDefinition(
                BuildPieceCategory.Wall,
                new Vector2Int(2, 1),
                "wall_material",
                4,
                "opening_construction",
                new BuildPart("window_wall_left", new Vector3(-0.78f, 1.4f, 0f), new Vector3(0.44f, 2.8f, 0.18f), wallMaterial),
                new BuildPart("window_wall_right", new Vector3(0.78f, 1.4f, 0f), new Vector3(0.44f, 2.8f, 0.18f), wallMaterial),
                new BuildPart("window_wall_bottom", new Vector3(0f, 0.55f, 0f), new Vector3(1.12f, 1.1f, 0.18f), wallMaterial),
                new BuildPart("window_wall_top", new Vector3(0f, 2.35f, 0f), new Vector3(1.12f, 0.9f, 0.18f), wallMaterial),
                new BuildPart("dark_window_frame", new Vector3(0f, 1.48f, -0.02f), new Vector3(0.95f, 0.82f, 0.08f), metalMaterial));

            definitions[ModularBuildPieceId.Fence] = new BuildPieceDefinition(
                BuildPieceCategory.Fence,
                new Vector2Int(2, 1),
                "fence_material",
                2,
                "boundary_construction",
                new BuildPart("fence_post_left", new Vector3(-0.9f, 0.7f, 0f), new Vector3(0.12f, 1.4f, 0.12f), woodMaterial),
                new BuildPart("fence_post_right", new Vector3(0.9f, 0.7f, 0f), new Vector3(0.12f, 1.4f, 0.12f), woodMaterial),
                new BuildPart("fence_rail_top", new Vector3(0f, 1.05f, 0f), new Vector3(1.9f, 0.12f, 0.12f), woodMaterial),
                new BuildPart("fence_rail_mid", new Vector3(0f, 0.58f, 0f), new Vector3(1.9f, 0.12f, 0.12f), woodMaterial));

            definitions[ModularBuildPieceId.Gate] = new BuildPieceDefinition(
                BuildPieceCategory.Gate,
                new Vector2Int(2, 1),
                "gate_material",
                3,
                "boundary_construction",
                new BuildPart("gate_post_left", new Vector3(-0.95f, 0.8f, 0f), new Vector3(0.14f, 1.6f, 0.14f), woodMaterial),
                new BuildPart("gate_post_right", new Vector3(0.95f, 0.8f, 0f), new Vector3(0.14f, 1.6f, 0.14f), woodMaterial),
                new BuildPart("gate_panel", new Vector3(0f, 0.75f, 0.04f), new Vector3(1.55f, 1.1f, 0.1f), woodMaterial));
        }

        private bool CanPiecesCoexist(BuildPieceDefinition candidate, PlacedBuildPiece existingRecord)
        {
            if (!Enum.TryParse(existingRecord.pieceId, out ModularBuildPieceId existingPieceId) ||
                !definitions.TryGetValue(existingPieceId, out var existing))
            {
                return false;
            }

            if (candidate.category == BuildPieceCategory.Floor || existing.category == BuildPieceCategory.Floor)
            {
                return candidate.category != existing.category;
            }

            if (candidate.category == BuildPieceCategory.Door && existing.category == BuildPieceCategory.Opening)
            {
                return true;
            }

            if (candidate.category == BuildPieceCategory.Opening && existing.category == BuildPieceCategory.Door)
            {
                return true;
            }

            return false;
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
            public readonly BuildPieceCategory category;
            public readonly Vector2Int footprintTiles;
            public readonly string resourceCostKey;
            public readonly int resourceCostUnits;
            public readonly string buildRequirementKey;
            public readonly BuildPart[] parts;

            public BuildPieceDefinition(
                BuildPieceCategory category,
                Vector2Int footprintTiles,
                string resourceCostKey,
                int resourceCostUnits,
                string buildRequirementKey,
                params BuildPart[] parts)
            {
                this.category = category;
                this.footprintTiles = new Vector2Int(Mathf.Max(1, footprintTiles.x), Mathf.Max(1, footprintTiles.y));
                this.resourceCostKey = string.IsNullOrEmpty(resourceCostKey) ? "placeholder" : resourceCostKey;
                this.resourceCostUnits = Mathf.Max(0, resourceCostUnits);
                this.buildRequirementKey = string.IsNullOrEmpty(buildRequirementKey) ? "basic_construction" : buildRequirementKey;
                this.parts = parts;
            }
        }

        private enum BuildPieceCategory
        {
            Floor,
            Wall,
            Opening,
            Door,
            Fence,
            Gate
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
            public List<ModularConstructionChunk> chunks = new List<ModularConstructionChunk>();
        }
    }
}
