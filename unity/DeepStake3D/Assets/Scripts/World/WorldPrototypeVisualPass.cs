using DeepStake.Characters;
using UnityEngine;
using UnityEngine.Rendering;

namespace DeepStake.World
{
    public static class WorldPrototypeVisualPass
    {
        private static Texture2D[] cachedTileTextures = System.Array.Empty<Texture2D>();
        private static Texture2D[] cachedWallTextures = System.Array.Empty<Texture2D>();
        private static readonly System.Collections.Generic.Dictionary<string, Material> paletteMaterials = new System.Collections.Generic.Dictionary<string, Material>();
        private static bool environmentTexturesLoaded;

        private const string GeneratedVisualRootName = "__GeneratedZoneVisuals";
        private const string PropVisualRootName = "__PropVisual";
        private const string PropVisualVersionName = "__PropVisualVersion_55";
        private static readonly bool UseDenseVillageClutter = false;
        private static readonly bool UseCleanBaseGround = true;
        private static readonly bool UseExpandedVillageDistricts = false;
        private const string LegacyCuteProxyRootName = "__CutePlayerProxy";
        private const string GroundDrySoilMaterialName = "DS_Ground_DrySoil";
        private const string GroundDirtPathMaterialName = "DS_Ground_DirtPath";
        private const string GroundMixedDirtGrassMaterialName = "DS_Ground_MixedDirtGrass";
        private const string GroundRecoveringGrassMaterialName = "DS_Ground_RecoveringGrass";
        private const string GroundGravelStorageMaterialName = "DS_Ground_GravelStorage";
        private const string GroundWornConcreteMaterialName = "DS_Ground_WornConcrete";
        private const string GroundCrackedPressureMaterialName = "DS_Ground_CrackedPressure";
        private const string BuildingWallPlasterMaterialName = "DS_Building_WallPlaster";
        private const string BuildingWornWoodMaterialName = "DS_Building_WornWood";
        private const string BuildingMutedMetalMaterialName = "DS_Building_MutedMetal";
        private const string BuildingRoofDarkMaterialName = "DS_Building_RoofDark";
        private const string BuildingRoofWarmMaterialName = "DS_Building_RoofWarm";
        private const string FoliageCanopyMaterialName = "DS_Foliage_Canopy";
        private const string PropSupplyCrateMaterialName = "DS_Prop_SupplyCrate";
        private const string PropAgedMetalSignMaterialName = "DS_Prop_AgedMetalSign";
        private const string BeaconRecoveryGlowMaterialName = "DS_Beacon_RecoveryGlow";

        private enum PaletteTextureKind
        {
            None,
            DrySoil,
            DirtPath,
            MixedDirtGrass,
            RecoveringGrass,
            GravelStorage,
            WornConcrete,
            CrackedPressure,
            WallPlaster,
            WornWood,
            MutedMetal,
            RoofDark,
            RoofWarm,
            DoorWood,
            WindowMuted
        }

        private readonly struct PaletteMaterialSpec
        {
            public PaletteMaterialSpec(string materialName, PaletteTextureKind textureKind, Color colorTint, Vector2 tiling, bool preferFlatShading = false)
            {
                MaterialName = materialName;
                TextureKind = textureKind;
                ColorTint = colorTint;
                Tiling = tiling;
                PreferFlatShading = preferFlatShading;
            }

            public string MaterialName { get; }
            public PaletteTextureKind TextureKind { get; }
            public Color ColorTint { get; }
            public Vector2 Tiling { get; }
            public bool PreferFlatShading { get; }
        }

        public static void EnsureCutePlayerProxy(Transform playerTransform)
        {
            if (playerTransform == null)
            {
                return;
            }

            var legacyRoot = playerTransform.Find(LegacyCuteProxyRootName);
            if (legacyRoot != null)
            {
                if (Application.isPlaying)
                {
                    Object.Destroy(legacyRoot.gameObject);
                }
                else
                {
                    Object.DestroyImmediate(legacyRoot.gameObject);
                }
            }

            var view = playerTransform.GetComponent<ArticulatedHumanoidView>();
            if (view == null)
            {
                view = playerTransform.gameObject.AddComponent<ArticulatedHumanoidView>();
            }
            view.Configure(ArticulatedHumanoidRole.Player);
        }

        public static void EnsureArchivistProxy(Transform npcTransform)
        {
            if (npcTransform == null)
            {
                return;
            }

            var view = npcTransform.GetComponent<ArticulatedHumanoidView>();
            if (view == null)
            {
                view = npcTransform.gameObject.AddComponent<ArticulatedHumanoidView>();
            }
            view.Configure(ArticulatedHumanoidRole.Archivist);
        }

        public static void EnsureWorldPropVisual(Transform target, string kind)
        {
            if (target == null)
            {
                return;
            }

            HideLegacyRenderers(target);

            var propRoot = target.Find(PropVisualRootName);
            if (propRoot == null)
            {
                var propObject = new GameObject(PropVisualRootName);
                propObject.transform.SetParent(target, false);
                propRoot = propObject.transform;
            }

            var hasCurrentVersion = propRoot.Find(PropVisualVersionName) != null;
            if (propRoot.childCount > 0 && !hasCurrentVersion)
            {
                for (var index = propRoot.childCount - 1; index >= 0; index--)
                {
                    var child = propRoot.GetChild(index);
                    if (Application.isPlaying)
                    {
                        Object.Destroy(child.gameObject);
                    }
                    else
                    {
                        Object.DestroyImmediate(child.gameObject);
                    }
                }
            }
            else if (propRoot.childCount > 0)
            {
                return;
            }

            var versionMarker = new GameObject(PropVisualVersionName);
            versionMarker.transform.SetParent(propRoot, false);

            switch (kind)
            {
                case "farm-sign":
                    CreateSignProp(propRoot);
                    break;
                case "supply-cache":
                    CreateSupplyProp(propRoot);
                    break;
                case "observer-record":
                    CreateObserverProp(propRoot);
                    break;
                case "recovery-beacon":
                    CreateBeaconPreview(propRoot);
                    break;
                case "supply-relay":
                    CreateRelayPreview(propRoot);
                    break;
            }
        }

        private static void HideLegacyRenderers(Transform target)
        {
            var renderers = target.GetComponents<Renderer>();
            for (var index = 0; index < renderers.Length; index++)
            {
                if (renderers[index] != null)
                {
                    renderers[index].enabled = false;
                }
            }
        }

        public static void RebuildZoneVisuals(
            Transform zoneRoot,
            WorldPrototype3DDefinition definition,
            Material fieldMaterial,
            Material archiveMaterial,
            Material placementMaterial,
            Material roadMaterial,
            Material storageMaterial)
        {
            if (zoneRoot == null || definition == null)
            {
                return;
            }

            var generatedRoot = zoneRoot.Find(GeneratedVisualRootName);
            if (generatedRoot == null)
            {
                var generatedObject = new GameObject(GeneratedVisualRootName);
                generatedObject.transform.SetParent(zoneRoot, false);
                generatedRoot = generatedObject.transform;
            }

            for (var index = generatedRoot.childCount - 1; index >= 0; index--)
            {
                var child = generatedRoot.GetChild(index);
                if (Application.isPlaying)
                {
                    Object.Destroy(child.gameObject);
                }
                else
                {
                    Object.DestroyImmediate(child.gameObject);
                }
            }

            if (definition.landmarks == null)
            {
                return;
            }

            CreateBaseGroundLayers(generatedRoot);
            if (UseCleanBaseGround)
            {
                return;
            }

            for (var index = 0; index < definition.landmarks.Length; index++)
            {
                CreateLandmarkVisual(
                    generatedRoot,
                    definition.landmarks[index],
                    fieldMaterial,
                    archiveMaterial,
                    placementMaterial,
                    roadMaterial,
                    storageMaterial);
            }
        }

        private static void CreateBaseGroundLayers(Transform root)
        {
            if (UseCleanBaseGround)
            {
                CreateVillageOpeningArea(root);
                return;
            }

            CreateVisualPiece(root, PrimitiveType.Cylinder, "SiteBase", new Vector3(-0.5f, -0.05f, 0.2f), new Vector3(7.8f, 0.08f, 5.8f), new Color(0.53f, 0.46f, 0.37f));
            CreateVisualPiece(root, PrimitiveType.Cylinder, "FarmApron", new Vector3(-1.8f, 0.0f, 1.6f), new Vector3(4.5f, 0.03f, 3.8f), new Color(0.55f, 0.5f, 0.39f));
            CreateVisualPiece(root, PrimitiveType.Capsule, "RoadBand", new Vector3(2.3f, -0.01f, -3.55f), new Vector3(5.3f, 0.02f, 0.95f), new Color(0.43f, 0.36f, 0.3f));
            CreateVisualPiece(root, PrimitiveType.Cylinder, "ArchiveYardPatch", new Vector3(2.7f, 0.01f, 3.8f), new Vector3(2.2f, 0.02f, 1.5f), new Color(0.5f, 0.45f, 0.37f));
            CreateVisualPiece(root, PrimitiveType.Cylinder, "SupplyLanePatch", new Vector3(-4.6f, 0.01f, -0.8f), new Vector3(1.9f, 0.02f, 1.6f), new Color(0.52f, 0.48f, 0.36f));
            CreateVisualPiece(root, PrimitiveType.Cylinder, "FieldPatchDark", new Vector3(-0.7f, 0.01f, 3.0f), new Vector3(2.4f, 0.02f, 1.2f), new Color(0.47f, 0.45f, 0.35f));
            CreateVisualPiece(root, PrimitiveType.Cylinder, "FieldPatchWarm", new Vector3(-3.7f, 0.01f, 1.8f), new Vector3(1.4f, 0.02f, 1.0f), new Color(0.58f, 0.52f, 0.38f));
            CreateVisualPiece(root, PrimitiveType.Cylinder, "MudPatchA", new Vector3(0.8f, 0.0f, 2.4f), new Vector3(1.2f, 0.02f, 0.8f), new Color(0.39f, 0.35f, 0.3f));
            CreateVisualPiece(root, PrimitiveType.Cylinder, "MudPatchB", new Vector3(-2.9f, 0.0f, -0.2f), new Vector3(0.8f, 0.02f, 0.6f), new Color(0.36f, 0.33f, 0.29f));
            CreateVisualPiece(root, PrimitiveType.Capsule, "ArchiveWalk", new Vector3(3.2f, 0.0f, 1.5f), new Vector3(1.1f, 0.02f, 0.22f), new Color(0.45f, 0.43f, 0.38f));
            CreateVisualPiece(root, PrimitiveType.Capsule, "WorkerLaneWalk", new Vector3(-3.3f, 0.0f, -1.2f), new Vector3(1.2f, 0.02f, 0.18f), new Color(0.44f, 0.41f, 0.34f));
            CreateVisualPiece(root, PrimitiveType.Capsule, "TrampledStripA", new Vector3(-1.1f, 0.0f, 0.2f), new Vector3(1.05f, 0.015f, 0.12f), new Color(0.47f, 0.43f, 0.36f));
            CreateVisualPiece(root, PrimitiveType.Capsule, "TrampledStripB", new Vector3(1.9f, 0.0f, 0.4f), new Vector3(0.95f, 0.015f, 0.1f), new Color(0.44f, 0.41f, 0.35f));
            CreateVisualPiece(root, PrimitiveType.Cylinder, "GrassPatchA", new Vector3(-4.8f, 0.0f, 2.7f), new Vector3(0.7f, 0.015f, 0.45f), new Color(0.34f, 0.39f, 0.29f));
            CreateVisualPiece(root, PrimitiveType.Cylinder, "GrassPatchB", new Vector3(4.8f, 0.0f, 3.6f), new Vector3(0.8f, 0.015f, 0.5f), new Color(0.35f, 0.4f, 0.3f));
            CreateVisualPiece(root, PrimitiveType.Capsule, "PathEdgeNorth", new Vector3(0.9f, 0.01f, 1.4f), new Vector3(0.9f, 0.015f, 0.08f), new Color(0.48f, 0.44f, 0.37f));
            CreateVisualPiece(root, PrimitiveType.Capsule, "PathEdgeSouth", new Vector3(0.5f, 0.01f, -1.8f), new Vector3(1.2f, 0.015f, 0.08f), new Color(0.43f, 0.4f, 0.34f));
            CreateVisualPiece(root, PrimitiveType.Cylinder, "SiteStoneA", new Vector3(5.1f, 0.04f, -2.2f), new Vector3(0.18f, 0.04f, 0.12f), new Color(0.46f, 0.46f, 0.45f));
            CreateVisualPiece(root, PrimitiveType.Cylinder, "SiteStoneB", new Vector3(-5.0f, 0.03f, 0.4f), new Vector3(0.16f, 0.03f, 0.1f), new Color(0.43f, 0.43f, 0.42f));
            CreateVisualPiece(root, PrimitiveType.Cylinder, "SiteStoneC", new Vector3(2.9f, 0.03f, 4.2f), new Vector3(0.14f, 0.03f, 0.09f), new Color(0.42f, 0.42f, 0.41f));
            CreateVisualPiece(root, PrimitiveType.Capsule, "ArchiveRug", new Vector3(3.95f, 0.0f, 2.35f), new Vector3(0.7f, 0.01f, 0.18f), new Color(0.34f, 0.31f, 0.28f));
            CreateVisualPiece(root, PrimitiveType.Capsule, "SupplyRutsA", new Vector3(-2.5f, 0.0f, -1.1f), new Vector3(0.9f, 0.01f, 0.05f), new Color(0.35f, 0.31f, 0.27f));
            CreateVisualPiece(root, PrimitiveType.Capsule, "SupplyRutsB", new Vector3(-2.5f, 0.0f, -0.75f), new Vector3(0.9f, 0.01f, 0.05f), new Color(0.35f, 0.31f, 0.27f));
            CreateVisualPiece(root, PrimitiveType.Cylinder, "FieldPatchCool", new Vector3(1.8f, 0.0f, 3.2f), new Vector3(1.05f, 0.015f, 0.6f), new Color(0.33f, 0.38f, 0.31f));
            CreateVisualPiece(root, PrimitiveType.Cylinder, "FieldPatchDust", new Vector3(-0.8f, 0.0f, -2.4f), new Vector3(0.9f, 0.015f, 0.55f), new Color(0.44f, 0.4f, 0.34f));
            CreateVisualPiece(root, PrimitiveType.Capsule, "ArchiveStep", new Vector3(3.55f, 0.04f, 1.95f), new Vector3(0.46f, 0.025f, 0.12f), new Color(0.43f, 0.4f, 0.36f));
            CreateVisualPiece(root, PrimitiveType.Capsule, "WorkerMat", new Vector3(-4.1f, 0.0f, -1.0f), new Vector3(0.5f, 0.01f, 0.16f), new Color(0.31f, 0.28f, 0.24f));
            CreateVisualPiece(root, PrimitiveType.Capsule, "BeaconLanePatch", new Vector3(0.55f, 0.0f, -1.2f), new Vector3(1.25f, 0.015f, 0.13f), new Color(0.46f, 0.42f, 0.34f));
            CreateVisualPiece(root, PrimitiveType.Capsule, "ArchiveLanePatch", new Vector3(3.35f, 0.0f, 2.65f), new Vector3(0.7f, 0.015f, 0.12f), new Color(0.4f, 0.37f, 0.33f));
            CreateVisualPiece(root, PrimitiveType.Capsule, "SupplyLanePatchDeep", new Vector3(-2.9f, 0.0f, -1.45f), new Vector3(1.15f, 0.015f, 0.12f), new Color(0.4f, 0.35f, 0.29f));
            CreateVisualPiece(root, PrimitiveType.Cylinder, "FieldMoundA", new Vector3(-4.6f, 0.08f, 3.5f), new Vector3(0.42f, 0.08f, 0.22f), new Color(0.46f, 0.42f, 0.33f));
            CreateVisualPiece(root, PrimitiveType.Cylinder, "FieldMoundB", new Vector3(-2.6f, 0.07f, 2.7f), new Vector3(0.38f, 0.07f, 0.2f), new Color(0.44f, 0.4f, 0.31f));
            CreateVisualPiece(root, PrimitiveType.Capsule, "FieldPathEdgeA", new Vector3(-2.1f, 0.01f, 2.05f), new Vector3(0.72f, 0.014f, 0.06f), new Color(0.46f, 0.42f, 0.34f));
            CreateVisualPiece(root, PrimitiveType.Capsule, "FieldPathEdgeB", new Vector3(-3.9f, 0.01f, 0.7f), new Vector3(0.64f, 0.014f, 0.06f), new Color(0.44f, 0.4f, 0.33f));
            CreateVisualPiece(root, PrimitiveType.Capsule, "FieldPathEdgeC", new Vector3(-1.1f, 0.01f, 3.55f), new Vector3(0.54f, 0.014f, 0.06f), new Color(0.45f, 0.41f, 0.34f));
            CreateVisualPiece(root, PrimitiveType.Capsule, "StorageEdgeA", new Vector3(-4.7f, 0.01f, -0.3f), new Vector3(0.52f, 0.014f, 0.06f), new Color(0.39f, 0.35f, 0.29f));
            CreateVisualPiece(root, PrimitiveType.Capsule, "NorthBerm", new Vector3(-1.2f, 0.26f, 5.45f), new Vector3(5.1f, 0.22f, 0.38f), new Color(0.36f, 0.39f, 0.33f));
            CreateVisualPiece(root, PrimitiveType.Capsule, "WestBerm", new Vector3(-6.65f, 0.22f, 0.8f), new Vector3(0.38f, 0.2f, 4.2f), new Color(0.35f, 0.37f, 0.32f));
            CreateVisualPiece(root, PrimitiveType.Capsule, "SouthRoadLip", new Vector3(1.4f, 0.08f, -4.85f), new Vector3(5.8f, 0.05f, 0.22f), new Color(0.39f, 0.34f, 0.3f));
            CreateVisualPiece(root, PrimitiveType.Cylinder, "ServiceShoulder", new Vector3(4.9f, 0.0f, -1.7f), new Vector3(2.4f, 0.03f, 2.8f), new Color(0.49f, 0.44f, 0.37f));
            CreateVisualPiece(root, PrimitiveType.Capsule, "WorkerLaneShadow", new Vector3(-3.2f, -0.01f, -1.7f), new Vector3(1.2f, 0.01f, 0.32f), new Color(0.41f, 0.39f, 0.33f));

            CreateTreeMass(root, "NorthTreeMassA", new Vector3(-4.4f, 0f, 5.5f), new Vector3(1.4f, 1.8f, 1.2f));
            CreateTreeMass(root, "NorthTreeMassB", new Vector3(1.8f, 0f, 5.7f), new Vector3(1.2f, 1.7f, 1.1f));
            CreateTreeMass(root, "NorthTreeMassC", new Vector3(5.1f, 0f, 5.5f), new Vector3(1.7f, 2.1f, 1.2f));

            CreateBackdropMass(root, "ArchiveBlockA", new Vector3(5.5f, 0f, 2.8f), new Vector3(1.5f, 2.6f, 1.6f), new Color(0.31f, 0.32f, 0.34f));
            CreateBackdropMass(root, "ArchiveBlockB", new Vector3(3.6f, 0f, 5.05f), new Vector3(2.4f, 2.3f, 1.0f), new Color(0.33f, 0.35f, 0.34f));
            CreateBackdropMass(root, "SupplyBlockA", new Vector3(-7.0f, 0f, -1.5f), new Vector3(1.1f, 1.8f, 1.3f), new Color(0.36f, 0.33f, 0.28f));
            CreateBackdropMass(root, "SupplyBlockB", new Vector3(-6.75f, 0f, 1.0f), new Vector3(1.1f, 1.55f, 2.1f), new Color(0.38f, 0.35f, 0.29f));
            CreateBackdropMass(root, "RoadMassWest", new Vector3(-5.8f, 0f, -4.8f), new Vector3(2.6f, 0.8f, 0.7f), new Color(0.31f, 0.32f, 0.33f));
            CreateBackdropMass(root, "RoadMassEast", new Vector3(7.3f, 0f, -4.7f), new Vector3(2.0f, 0.8f, 0.7f), new Color(0.31f, 0.32f, 0.33f));

            CreateFenceLine(root, "NorthFence", new Vector3(-4.8f, 0f, 4.85f), new Vector3(5.0f, 0f, 4.85f), new Color(0.47f, 0.41f, 0.31f));
            CreateFenceLine(root, "WestFence", new Vector3(-5.95f, 0f, -2.2f), new Vector3(-5.95f, 0f, 3.2f), new Color(0.45f, 0.39f, 0.3f));
            CreateFenceLine(root, "SouthBarrier", new Vector3(-3.0f, 0f, -4.25f), new Vector3(6.5f, 0f, -4.25f), new Color(0.34f, 0.35f, 0.37f));

            CreateSmallPropCluster(root, "WorkerBenchCluster", new Vector3(-3.9f, 0f, -1.5f), new Color(0.43f, 0.38f, 0.29f));
            CreateSmallPropCluster(root, "ArchiveCache", new Vector3(4.4f, 0f, 2.0f), new Color(0.41f, 0.39f, 0.34f));
            CreateSmallPropCluster(root, "SupplyScatter", new Vector3(-1.6f, 0f, -1.4f), new Color(0.42f, 0.36f, 0.28f));
            CreateLooseTarp(root, "WorkerTarp", new Vector3(-4.65f, 0f, -0.95f), new Color(0.24f, 0.3f, 0.32f));
            CreateLooseTarp(root, "ArchiveTarp", new Vector3(3.55f, 0f, 2.55f), new Color(0.26f, 0.29f, 0.31f));
            CreateFenceBreak(root, "FenceBreakWest", new Vector3(-5.95f, 0f, -0.7f), new Color(0.45f, 0.39f, 0.3f));
            CreateFenceBreak(root, "FenceBreakNorth", new Vector3(1.4f, 0f, 4.85f), new Color(0.47f, 0.41f, 0.31f));
            CreateStakeLine(root, "FieldStakeLineA", new Vector3(-4.1f, 0f, 2.3f), 4, new Vector3(0.5f, 0f, 0.1f), new Color(0.46f, 0.4f, 0.3f));
            CreateStakeLine(root, "FieldStakeLineB", new Vector3(-4.4f, 0f, 1.0f), 3, new Vector3(0.45f, 0f, 0.12f), new Color(0.44f, 0.38f, 0.28f));
            CreateCableSpool(root, "ArchiveSpool", new Vector3(2.75f, 0f, 2.05f), new Color(0.35f, 0.31f, 0.24f));
            CreateCableSpool(root, "WorkerSpool", new Vector3(-4.75f, 0f, -1.65f), new Color(0.33f, 0.29f, 0.22f));
            CreateCrateStack(root, "SupplyStackA", new Vector3(-1.1f, 0f, -1.8f), new Color(0.4f, 0.34f, 0.28f));
            CreateCrateStack(root, "ArchiveStackA", new Vector3(4.95f, 0f, 1.35f), new Color(0.38f, 0.34f, 0.29f));
            CreateMarkerFlag(root, "BeaconFlag", new Vector3(0.2f, 0f, -1.05f), new Color(0.63f, 0.56f, 0.36f));
            CreateMarkerFlag(root, "WorkerFlag", new Vector3(-3.0f, 0f, -1.3f), new Color(0.58f, 0.5f, 0.3f));
            CreateToolScatter(root, "WorkerTools", new Vector3(-4.35f, 0f, -1.85f), new Color(0.42f, 0.38f, 0.3f));
            CreatePaperScatter(root, "ArchivePapers", new Vector3(4.2f, 0f, 2.45f), new Color(0.66f, 0.61f, 0.52f));
            CreateSupplyMarker(root, "SupplyMarkerPost", new Vector3(-1.7f, 0f, -1.7f), new Color(0.55f, 0.47f, 0.28f));
            CreateArchiveShelf(root, "ArchiveShelfExt", new Vector3(5.2f, 0f, 2.1f), new Color(0.4f, 0.36f, 0.3f));
            CreateStackedPosts(root, "WorkerPosts", new Vector3(-4.9f, 0f, -0.25f), new Color(0.42f, 0.36f, 0.28f));
            CreateStackedPosts(root, "ArchivePosts", new Vector3(4.8f, 0f, 3.05f), new Color(0.4f, 0.35f, 0.29f));
            CreateGroundDebris(root, "WorkerDebris", new Vector3(-3.25f, 0f, -2.15f), new Color(0.39f, 0.35f, 0.3f));
            CreateGroundDebris(root, "ArchiveDebris", new Vector3(3.2f, 0f, 1.35f), new Color(0.42f, 0.39f, 0.34f));
            CreateGroundDebris(root, "FieldDebris", new Vector3(-2.2f, 0f, 3.8f), new Color(0.41f, 0.37f, 0.31f));
            CreateStakeBundle(root, "WorkerStakeBundle", new Vector3(-5.15f, 0f, -1.05f), new Color(0.44f, 0.38f, 0.28f));
            CreateStakeBundle(root, "FieldStakeBundle", new Vector3(-4.2f, 0f, 2.9f), new Color(0.46f, 0.4f, 0.3f));
            CreateCanCluster(root, "WorkerCans", new Vector3(-4.55f, 0f, -1.9f), new Color(0.46f, 0.48f, 0.46f));
            CreateCanCluster(root, "SupplyCans", new Vector3(-1.05f, 0f, -2.05f), new Color(0.48f, 0.49f, 0.47f));
            CreateClothLine(root, "ArchiveClothLine", new Vector3(3.1f, 0f, 3.55f), new Vector3(4.6f, 0f, 3.72f), new Color(0.43f, 0.44f, 0.42f));
            CreateClothLine(root, "WorkerClothLine", new Vector3(-4.9f, 0f, -0.45f), new Vector3(-3.55f, 0f, -0.25f), new Color(0.41f, 0.38f, 0.34f));
            CreateBackdropMass(root, "NorthHedge", new Vector3(-0.8f, 0f, 6.4f), new Vector3(6.8f, 1.4f, 0.9f), new Color(0.33f, 0.38f, 0.32f));
            CreateBackdropMass(root, "WorkerShackMass", new Vector3(-6.2f, 0f, -0.2f), new Vector3(1.9f, 1.6f, 1.6f), new Color(0.34f, 0.32f, 0.28f));
            CreateBackdropMass(root, "ArchiveStoreMass", new Vector3(5.8f, 0f, 4.15f), new Vector3(2.4f, 1.8f, 1.2f), new Color(0.33f, 0.35f, 0.34f));
            CreateCrateStack(root, "WorkerCratesB", new Vector3(-5.45f, 0f, -0.45f), new Color(0.39f, 0.34f, 0.28f));
            CreateCrateStack(root, "ArchiveCratesB", new Vector3(4.75f, 0f, 3.4f), new Color(0.38f, 0.34f, 0.3f));
            CreatePaperScatter(root, "ArchivePapersB", new Vector3(3.55f, 0f, 3.0f), new Color(0.68f, 0.64f, 0.58f));
            CreateToolScatter(root, "WorkerToolsB", new Vector3(-4.85f, 0f, -0.55f), new Color(0.41f, 0.37f, 0.31f));
            CreatePathPost(root, "BeaconGuideA", new Vector3(-0.2f, 0f, -0.8f), new Color(0.62f, 0.56f, 0.37f));
            CreatePathPost(root, "BeaconGuideB", new Vector3(0.9f, 0f, -1.6f), new Color(0.62f, 0.56f, 0.37f));
            CreatePathPost(root, "WorkerGuide", new Vector3(-2.4f, 0f, -1.6f), new Color(0.59f, 0.52f, 0.34f));
            CreatePathPost(root, "ArchiveGuide", new Vector3(2.95f, 0f, 1.85f), new Color(0.56f, 0.51f, 0.38f));
            CreateGroundDebris(root, "RoadDebrisA", new Vector3(2.1f, 0f, -3.9f), new Color(0.34f, 0.33f, 0.31f));
            CreateGroundDebris(root, "RoadDebrisB", new Vector3(-1.4f, 0f, -3.6f), new Color(0.36f, 0.35f, 0.33f));
            CreateStakeBundle(root, "ArchiveStakeBundle", new Vector3(4.2f, 0f, 2.2f), new Color(0.41f, 0.36f, 0.29f));
            CreateCanCluster(root, "ArchiveCans", new Vector3(5.0f, 0f, 2.7f), new Color(0.46f, 0.47f, 0.45f));
            CreateSmallPropCluster(root, "FieldTools", new Vector3(-2.8f, 0f, 2.6f), new Color(0.4f, 0.35f, 0.28f));
            CreateLooseTarp(root, "FieldTarpB", new Vector3(-1.7f, 0f, 3.4f), new Color(0.27f, 0.31f, 0.29f));
            CreateFenceLine(root, "ArchiveFenceShort", new Vector3(2.6f, 0f, 1.3f), new Vector3(5.2f, 0f, 1.3f), new Color(0.41f, 0.37f, 0.3f));
            CreateFenceLine(root, "WorkerFenceShort", new Vector3(-5.6f, 0f, -2.4f), new Vector3(-3.8f, 0f, -2.4f), new Color(0.39f, 0.35f, 0.29f));
            CreateBackdropMass(root, "FieldBackdropWest", new Vector3(-6.8f, 0f, 3.1f), new Vector3(1.8f, 1.2f, 1.4f), new Color(0.34f, 0.37f, 0.32f));
            CreateBackdropMass(root, "FieldBackdropEast", new Vector3(6.8f, 0f, 1.6f), new Vector3(1.7f, 1.1f, 1.5f), new Color(0.35f, 0.37f, 0.34f));
            CreateGroundDebris(root, "ArchiveEntryDebris", new Vector3(2.8f, 0f, 1.55f), new Color(0.39f, 0.37f, 0.34f));
            CreateGroundDebris(root, "WorkerEntryDebris", new Vector3(-3.6f, 0f, -1.85f), new Color(0.38f, 0.35f, 0.31f));
            CreateCanCluster(root, "FieldCans", new Vector3(-2.1f, 0f, 2.9f), new Color(0.45f, 0.46f, 0.44f));
            CreateToolScatter(root, "BeaconTools", new Vector3(0.5f, 0f, -1.85f), new Color(0.42f, 0.39f, 0.33f));
            CreateSmallPropCluster(root, "ArchiveBenchB", new Vector3(4.1f, 0f, 1.55f), new Color(0.39f, 0.35f, 0.29f));
            CreateSmallPropCluster(root, "WorkerBenchB", new Vector3(-4.95f, 0f, -1.05f), new Color(0.4f, 0.35f, 0.28f));
            CreateCrateStack(root, "BeaconSupplies", new Vector3(1.25f, 0f, -1.95f), new Color(0.41f, 0.36f, 0.3f));
            CreateLooseTarp(root, "BeaconTarp", new Vector3(1.45f, 0f, -1.35f), new Color(0.25f, 0.29f, 0.31f));
            CreateBackdropMass(root, "RoadBackdropSouth", new Vector3(0.2f, 0f, -5.8f), new Vector3(4.6f, 0.9f, 0.8f), new Color(0.31f, 0.32f, 0.33f));
            CreateBackdropMass(root, "ArchiveCanopyMass", new Vector3(3.5f, 0f, 4.9f), new Vector3(2.6f, 0.9f, 0.8f), new Color(0.35f, 0.36f, 0.35f));
            CreateFenceBreak(root, "RoadBreakWest", new Vector3(-2.6f, 0f, -4.25f), new Color(0.36f, 0.36f, 0.37f));
            CreateFenceBreak(root, "RoadBreakEast", new Vector3(3.9f, 0f, -4.25f), new Color(0.36f, 0.36f, 0.37f));
            CreateToolScatter(root, "ArchiveToolsB", new Vector3(4.7f, 0f, 2.0f), new Color(0.4f, 0.37f, 0.32f));
            CreatePaperScatter(root, "WorkerNotes", new Vector3(-3.9f, 0f, -1.15f), new Color(0.63f, 0.6f, 0.54f));
            CreateStakeLine(root, "BeaconStakeLine", new Vector3(-0.2f, 0f, -0.4f), 4, new Vector3(0.38f, 0f, -0.22f), new Color(0.52f, 0.45f, 0.3f));
            CreateBackdropMass(root, "ArchiveRearBlock", new Vector3(4.8f, 0f, 5.4f), new Vector3(2.4f, 1.3f, 0.9f), new Color(0.34f, 0.35f, 0.34f));
            CreateBackdropMass(root, "WorkerRearBlock", new Vector3(-6.6f, 0f, 1.2f), new Vector3(1.6f, 1.2f, 1.4f), new Color(0.35f, 0.33f, 0.29f));
            CreateCrateStack(root, "ArchiveSupplySide", new Vector3(5.4f, 0f, 2.6f), new Color(0.39f, 0.35f, 0.3f));
            CreateCrateStack(root, "WorkerSupplySide", new Vector3(-5.55f, 0f, -1.55f), new Color(0.4f, 0.34f, 0.28f));
            CreateLooseTarp(root, "ArchiveTarpB", new Vector3(4.55f, 0f, 2.8f), new Color(0.26f, 0.29f, 0.3f));
            CreateFenceLine(root, "BeaconFenceShort", new Vector3(-0.9f, 0f, -2.35f), new Vector3(1.9f, 0f, -2.35f), new Color(0.41f, 0.37f, 0.31f));
            CreateGroundDebris(root, "ArchiveRearDebris", new Vector3(4.95f, 0f, 4.2f), new Color(0.38f, 0.36f, 0.33f));
            CreateGroundDebris(root, "WorkerRearDebris", new Vector3(-5.95f, 0f, 0.2f), new Color(0.37f, 0.34f, 0.3f));
            CreatePathPost(root, "ArchiveBackGuide", new Vector3(4.35f, 0f, 3.25f), new Color(0.52f, 0.48f, 0.37f));
            CreatePathPost(root, "WorkerBackGuide", new Vector3(-4.95f, 0f, -0.15f), new Color(0.5f, 0.45f, 0.33f));
            CreateSmallPropCluster(root, "ArchiveRearBench", new Vector3(5.2f, 0f, 3.6f), new Color(0.38f, 0.34f, 0.29f));
            CreateSmallPropCluster(root, "WorkerRearBench", new Vector3(-5.85f, 0f, 0.75f), new Color(0.39f, 0.34f, 0.28f));
            CreateCanCluster(root, "BeaconCans", new Vector3(0.9f, 0f, -1.2f), new Color(0.47f, 0.48f, 0.46f));
            CreateGroundDebris(root, "BeaconRearDebris", new Vector3(0.1f, 0f, -2.2f), new Color(0.39f, 0.36f, 0.32f));
            CreateFenceLine(root, "FieldFenceEast", new Vector3(5.9f, 0f, 0.8f), new Vector3(5.9f, 0f, 3.9f), new Color(0.4f, 0.37f, 0.31f));
            CreateCrateStack(root, "ArchiveRearCrates", new Vector3(5.55f, 0f, 4.45f), new Color(0.38f, 0.34f, 0.29f));
            CreateCrateStack(root, "WorkerRearCrates", new Vector3(-6.2f, 0f, 0.35f), new Color(0.39f, 0.33f, 0.28f));
            CreateToolScatter(root, "BeaconToolsB", new Vector3(1.4f, 0f, -1.55f), new Color(0.41f, 0.37f, 0.32f));
            CreatePaperScatter(root, "ArchiveRearPapers", new Vector3(4.75f, 0f, 3.95f), new Color(0.66f, 0.63f, 0.58f));
            CreateGroundDebris(root, "FieldEdgeDebrisEast", new Vector3(5.4f, 0f, 2.55f), new Color(0.38f, 0.35f, 0.31f));
            CreateStakeBundle(root, "ArchiveStakeRear", new Vector3(5.95f, 0f, 4.95f), new Color(0.44f, 0.38f, 0.3f));
            CreateStakeBundle(root, "WorkerStakeRear", new Vector3(-6.55f, 0f, 0.95f), new Color(0.43f, 0.37f, 0.29f));
            CreateGroundDebris(root, "ArchiveSideDebris", new Vector3(5.9f, 0f, 2.9f), new Color(0.39f, 0.36f, 0.32f));
            CreateGroundDebris(root, "WorkerSideDebris", new Vector3(-5.9f, 0f, -0.85f), new Color(0.38f, 0.34f, 0.3f));
            CreateCanCluster(root, "ArchiveSideCans", new Vector3(5.45f, 0f, 2.55f), new Color(0.47f, 0.48f, 0.46f));
            CreateBackdropMass(root, "ArchiveRearMassB", new Vector3(6.4f, 0f, 4.95f), new Vector3(1.4f, 1.25f, 0.95f), new Color(0.33f, 0.34f, 0.34f));
            CreateBackdropMass(root, "WorkerRearMassB", new Vector3(-6.95f, 0f, 1.85f), new Vector3(1.25f, 1.15f, 1.05f), new Color(0.35f, 0.33f, 0.29f));
            CreateGroundDebris(root, "ArchiveOuterDebris", new Vector3(6.35f, 0f, 3.85f), new Color(0.39f, 0.36f, 0.32f));
            CreateGroundDebris(root, "WorkerOuterDebris", new Vector3(-6.55f, 0f, -0.15f), new Color(0.38f, 0.34f, 0.3f));
            CreateCanCluster(root, "WorkerRearCans", new Vector3(-6.45f, 0f, 0.55f), new Color(0.46f, 0.47f, 0.45f));
            CreatePathPost(root, "ArchiveOuterGuide", new Vector3(5.95f, 0f, 3.25f), new Color(0.51f, 0.46f, 0.34f));
            CreatePathPost(root, "WorkerOuterGuide", new Vector3(-6.15f, 0f, -0.45f), new Color(0.49f, 0.44f, 0.32f));
            CreateFenceLine(root, "ArchiveRearFence", new Vector3(4.5f, 0f, 5.15f), new Vector3(6.6f, 0f, 5.15f), new Color(0.4f, 0.37f, 0.31f));
            CreateFenceLine(root, "WorkerRearFence", new Vector3(-6.55f, 0f, -0.55f), new Vector3(-6.55f, 0f, 1.85f), new Color(0.39f, 0.35f, 0.3f));
            CreateBackdropMass(root, "ArchiveOuterMass", new Vector3(6.95f, 0f, 3.55f), new Vector3(1.1f, 1.1f, 1.05f), new Color(0.33f, 0.34f, 0.34f));
            CreateBackdropMass(root, "WorkerOuterMass", new Vector3(-6.95f, 0f, -0.85f), new Vector3(1.05f, 1.0f, 0.95f), new Color(0.35f, 0.33f, 0.29f));
            CreateGroundDebris(root, "ArchiveFenceDebris", new Vector3(5.15f, 0f, 5.0f), new Color(0.39f, 0.36f, 0.32f));
            CreateGroundDebris(root, "WorkerFenceDebris", new Vector3(-6.2f, 0f, 1.55f), new Color(0.38f, 0.34f, 0.3f));
            CreateCanCluster(root, "BeaconRearCans", new Vector3(1.5f, 0f, -2.0f), new Color(0.46f, 0.47f, 0.45f));
            CreateStakeBundle(root, "BeaconStakeRear", new Vector3(1.95f, 0f, -2.25f), new Color(0.44f, 0.38f, 0.29f));
            CreatePathPost(root, "FieldOuterGuide", new Vector3(-5.55f, 0f, 3.65f), new Color(0.5f, 0.45f, 0.33f));
            CreateGroundDebris(root, "RoadEdgeDebrisWest", new Vector3(-4.8f, 0f, -4.55f), new Color(0.37f, 0.35f, 0.33f));
            CreateGroundDebris(root, "RoadEdgeDebrisEast", new Vector3(5.6f, 0f, -4.45f), new Color(0.37f, 0.35f, 0.33f));
            CreateStakeBundle(root, "FieldOuterStakeA", new Vector3(-5.05f, 0f, 4.25f), new Color(0.44f, 0.39f, 0.3f));
            CreateStakeBundle(root, "FieldOuterStakeB", new Vector3(-3.6f, 0f, 4.65f), new Color(0.44f, 0.39f, 0.3f));
            CreateBackdropMass(root, "FieldNorthMassA", new Vector3(-3.4f, 0f, 6.05f), new Vector3(1.4f, 0.9f, 0.85f), new Color(0.34f, 0.38f, 0.33f));
            CreateBackdropMass(root, "FieldNorthMassB", new Vector3(2.9f, 0f, 6.0f), new Vector3(1.2f, 0.85f, 0.8f), new Color(0.34f, 0.38f, 0.33f));
            CreateSmallPropCluster(root, "RoadWestCluster", new Vector3(-4.25f, 0f, -4.05f), new Color(0.39f, 0.35f, 0.31f));
            CreateSmallPropCluster(root, "RoadEastCluster", new Vector3(5.2f, 0f, -4.0f), new Color(0.39f, 0.35f, 0.31f));
            CreateGroundDebris(root, "ArchiveMidDebris", new Vector3(4.35f, 0f, 2.95f), new Color(0.39f, 0.36f, 0.32f));
            CreateGroundDebris(root, "WorkerMidDebris", new Vector3(-4.9f, 0f, -0.95f), new Color(0.38f, 0.34f, 0.3f));
            CreateCanCluster(root, "RoadCansWest", new Vector3(-3.9f, 0f, -4.35f), new Color(0.46f, 0.47f, 0.45f));
            CreateCanCluster(root, "RoadCansEast", new Vector3(4.95f, 0f, -4.2f), new Color(0.46f, 0.47f, 0.45f));
            CreateGroundDebris(root, "FieldLinkDebrisA", new Vector3(-2.2f, 0f, 1.1f), new Color(0.4f, 0.36f, 0.31f));
            CreateGroundDebris(root, "FieldLinkDebrisB", new Vector3(1.7f, 0f, 1.4f), new Color(0.4f, 0.36f, 0.31f));
            CreateSmallPropCluster(root, "ArchiveLinkCluster", new Vector3(2.8f, 0f, 1.8f), new Color(0.39f, 0.35f, 0.31f));
            CreateSmallPropCluster(root, "WorkerLinkCluster", new Vector3(-2.4f, 0f, -1.1f), new Color(0.39f, 0.35f, 0.31f));
            CreatePathPost(root, "ArchiveMidGuide", new Vector3(2.2f, 0f, 1.5f), new Color(0.5f, 0.45f, 0.33f));
            CreatePathPost(root, "WorkerMidGuide", new Vector3(-2.0f, 0f, -1.25f), new Color(0.49f, 0.44f, 0.32f));
        }

        private static void CreateVillageOpeningArea(Transform root)
        {
            CreateNaturalLight(root);
            CreateVisualPiece(root, PrimitiveType.Cube, "ContinuousTerrainBase", new Vector3(-0.15f, -0.16f, 0.25f), new Vector3(44f, 0.06f, 36f), new Color(0.27f, 0.33f, 0.27f));
            CreateVisualPiece(root, PrimitiveType.Cube, "OuterFieldTerrainBase", new Vector3(-5.8f, -0.118f, 5.1f), new Vector3(17f, 0.045f, 13f), new Color(0.31f, 0.38f, 0.27f));
            CreateVisualPiece(root, PrimitiveType.Cube, "VillagePackedEarthBase", new Vector3(-0.25f, -0.09f, 0.05f), new Vector3(18f, 0.04f, 13.5f), new Color(0.36f, 0.34f, 0.28f));
            CreateTilePatch(root, "OuterRecoveryGroundTile", new Vector3(-0.05f, 0.0f, 0.1f), 39, 32, 0.88f, new Color(0.34f, 0.39f, 0.32f));
            CreateTilePatch(root, "VillageGroundTile", new Vector3(-0.2f, 0.018f, 0.2f), 21, 16, 0.84f, new Color(0.43f, 0.41f, 0.34f));
            CreateTilePatch(root, "VillageMainRoadTile", new Vector3(0.05f, 0.04f, -2.05f), 12, 3, 0.8f, new Color(0.31f, 0.31f, 0.3f));
            CreateTilePatch(root, "VillageCrossRoadTile", new Vector3(-0.8f, 0.042f, 0.45f), 3, 8, 0.74f, new Color(0.34f, 0.33f, 0.29f));
            CreateTilePatch(root, "ArchiveCourtTile", new Vector3(3.3f, 0.012f, 2.0f), 4, 3, 0.72f, new Color(0.46f, 0.44f, 0.38f));
            CreateTilePatch(root, "WorkerYardTile", new Vector3(-3.75f, 0.012f, -0.45f), 4, 3, 0.72f, new Color(0.45f, 0.4f, 0.32f));
            CreateTilePatch(root, "BeaconCourtTile", new Vector3(0.75f, 0.014f, -1.2f), 3, 3, 0.68f, new Color(0.49f, 0.44f, 0.32f));
            CreateGroundZonePatch(root, "PlayerStartPocketZone", new Vector3(-2.55f, 0f, 1.08f), new Vector3(3.8f, 0.03f, 2.4f), new Color(0.5f, 0.43f, 0.33f), 0.058f);
            CreateGroundZonePatch(root, "PlayerStartPocketShade", new Vector3(-2.6f, 0f, 1.05f), new Vector3(4.7f, 0.02f, 3.1f), new Color(0.37f, 0.35f, 0.3f), 0.032f);
            CreateGroundZonePatch(root, "NoticeRouteSpineZoneA", new Vector3(-3.1f, 0f, 1.38f), new Vector3(2.3f, 0.03f, 1.0f), new Color(0.58f, 0.49f, 0.35f), 0.062f);
            CreateGroundZonePatch(root, "NoticeRouteSpineZoneB", new Vector3(-4.05f, 0f, 1.95f), new Vector3(2.75f, 0.03f, 1.08f), new Color(0.58f, 0.49f, 0.35f), 0.062f);
            CreateGroundZonePatch(root, "NoticeRouteFringeNorth", new Vector3(-3.72f, 0f, 2.42f), new Vector3(4.5f, 0.02f, 1.45f), new Color(0.41f, 0.43f, 0.35f), 0.034f);
            CreateGroundZonePatch(root, "NoticeRouteFringeSouth", new Vector3(-3.42f, 0f, 0.88f), new Vector3(4.1f, 0.02f, 1.2f), new Color(0.43f, 0.4f, 0.33f), 0.034f);
            CreateGroundZonePatch(root, "NoticeBoardZone", new Vector3(-4.5f, 0f, 2.28f), new Vector3(3.2f, 0.034f, 2.1f), new Color(0.59f, 0.5f, 0.35f), 0.068f);
            CreateGroundZonePatch(root, "NoticeBoardZoneRear", new Vector3(-4.7f, 0f, 3.45f), new Vector3(5.8f, 0.024f, 2.7f), new Color(0.45f, 0.49f, 0.37f), 0.038f);
            CreateGroundZonePatch(root, "NoticeBoardZoneSide", new Vector3(-5.72f, 0f, 2.05f), new Vector3(2.2f, 0.02f, 2.15f), new Color(0.49f, 0.45f, 0.34f), 0.034f);
            CreateGroundZonePatch(root, "FirstScreenNoGridBackdrop", new Vector3(-1.1f, 0f, 3.62f), new Vector3(17.8f, 0.031f, 5.9f), new Color(0.38f, 0.42f, 0.32f), 0.058f);
            CreateGroundZonePatch(root, "FirstScreenLeftNoGridShoulder", new Vector3(-6.08f, 0f, 1.35f), new Vector3(3.7f, 0.028f, 5.75f), new Color(0.39f, 0.38f, 0.3f), 0.05f);
            CreateGroundZonePatch(root, "FirstScreenCameraForegroundMatte", new Vector3(-1.15f, 0f, -0.72f), new Vector3(10.2f, 0.029f, 3.85f), new Color(0.35f, 0.33f, 0.28f), 0.046f);
            CreateGroundZonePatch(root, "FirstScreenRightNoGridShoulder", new Vector3(4.75f, 0f, 1.85f), new Vector3(5.4f, 0.027f, 5.25f), new Color(0.4f, 0.39f, 0.32f), 0.045f);
            CreateGroundZonePatch(root, "NorthRecoveryBandZone", new Vector3(-0.35f, 0f, 4.55f), new Vector3(13.6f, 0.026f, 3.0f), new Color(0.46f, 0.5f, 0.39f), 0.04f);
            CreateGroundZonePatch(root, "NorthRightRecoveryZone", new Vector3(4.9f, 0f, 3.28f), new Vector3(6.1f, 0.024f, 2.55f), new Color(0.45f, 0.49f, 0.38f), 0.036f);
            CreateGroundZonePatch(root, "RightVillageYardZone", new Vector3(4.82f, 0f, 0.72f), new Vector3(5.8f, 0.03f, 4.2f), new Color(0.48f, 0.43f, 0.37f), 0.06f);
            CreateGroundZonePatch(root, "RightVillageApronZone", new Vector3(4.45f, 0f, 0.18f), new Vector3(4.6f, 0.028f, 2.1f), new Color(0.55f, 0.49f, 0.39f), 0.066f);
            CreateGroundZonePatch(root, "RightVillageRearZone", new Vector3(6.55f, 0f, 1.62f), new Vector3(3.8f, 0.022f, 2.7f), new Color(0.47f, 0.44f, 0.38f), 0.034f);

            CreateVillageBuilding(root, "ArchiveBuilding", new Vector3(4.35f, 0f, 3.25f), new Vector3(2.35f, 1.45f, 1.65f), new Color(0.37f, 0.4f, 0.4f), new Color(0.34f, 0.35f, 0.34f), true);
            CreateVillageBuilding(root, "WorkerHouse", new Vector3(-4.9f, 0f, 0.45f), new Vector3(1.85f, 1.25f, 1.45f), new Color(0.42f, 0.36f, 0.28f), new Color(0.39f, 0.33f, 0.26f), false);
            CreateVillageBuilding(root, "SupplyStorehouse", new Vector3(-2.65f, 0f, -3.95f), new Vector3(2.5f, 1.25f, 1.35f), new Color(0.39f, 0.35f, 0.28f), new Color(0.36f, 0.34f, 0.31f), false);
            CreateVillageBuilding(root, "ClinicCottage", new Vector3(1.4f, 0f, 4.45f), new Vector3(1.65f, 1.1f, 1.35f), new Color(0.39f, 0.38f, 0.34f), new Color(0.4f, 0.35f, 0.29f), false);
            CreateVillageBuilding(root, "NorthFarmhouse", new Vector3(-1.1f, 0f, 5.15f), new Vector3(2.1f, 1.2f, 1.35f), new Color(0.4f, 0.37f, 0.31f), new Color(0.39f, 0.34f, 0.27f), false);

            CreatePerimeterWall(root, "NorthVillageWall", new Vector3(-5.5f, 0f, 4.85f), new Vector3(5.85f, 0f, 4.85f), new Color(0.39f, 0.36f, 0.31f));
            CreatePerimeterWall(root, "WestVillageWall", new Vector3(-6.15f, 0f, -3.8f), new Vector3(-6.15f, 0f, 3.9f), new Color(0.37f, 0.34f, 0.3f));
            CreatePerimeterWall(root, "SouthVillageWallWest", new Vector3(-5.0f, 0f, -4.75f), new Vector3(-0.65f, 0f, -4.75f), new Color(0.34f, 0.34f, 0.34f));
            CreatePerimeterWall(root, "SouthVillageWallEast", new Vector3(1.65f, 0f, -4.75f), new Vector3(5.7f, 0f, -4.75f), new Color(0.34f, 0.34f, 0.34f));
            CreateVillageGate(root, "SouthGate", new Vector3(0.5f, 0f, -4.72f), new Color(0.42f, 0.36f, 0.27f));
            CreateAuthorityCheckpoint(root);
            CreateFirstScreenBoundaryBreakers(root);

            CreateFieldRows(root, "RecoveryFieldRows", new Vector3(-4.65f, 0f, 2.35f), 7, new Color(0.43f, 0.39f, 0.27f));
            CreateGrassBorder(root, "NorthGrass", new Vector3(-5.2f, 0f, 5.55f), 8, new Vector3(0.95f, 0f, 0.08f), new Color(0.31f, 0.39f, 0.27f));
            CreateGrassBorder(root, "EastGrass", new Vector3(6.2f, 0f, -3.6f), 7, new Vector3(0.0f, 0f, 0.92f), new Color(0.32f, 0.39f, 0.28f));
            CreateGrassBorder(root, "WestGrass", new Vector3(-6.75f, 0f, -3.1f), 7, new Vector3(0.0f, 0f, 0.88f), new Color(0.3f, 0.37f, 0.26f));
            CreateRiverEdge(root, "EastRiver", new Vector3(8.05f, 0f, -4.5f), new Color(0.24f, 0.42f, 0.49f));
            CreateMarketAwning(root, "SupplyAwning", new Vector3(-1.45f, 0f, -5.15f), new Color(0.25f, 0.32f, 0.34f));
            CreateMarketAwning(root, "ArchiveAwning", new Vector3(3.95f, 0f, 1.1f), new Color(0.3f, 0.33f, 0.34f));

            CreateGroundContactPatch(root, "NoticeBoardContact", new Vector3(-4.42f, 0f, 2.22f), new Vector3(2.8f, 0.018f, 1.8f), new Color(0.18f, 0.15f, 0.12f), 0.96f);
            CreateGroundContactPatch(root, "PlayerStartContact", new Vector3(-2.48f, 0f, 1.16f), new Vector3(3.2f, 0.018f, 1.7f), new Color(0.17f, 0.14f, 0.11f), 0.96f);
            CreateGroundContactPatch(root, "PlayerStartHaloContact", new Vector3(-2.3f, 0f, 1.02f), new Vector3(1.95f, 0.015f, 1.05f), new Color(0.11f, 0.09f, 0.08f), 0.96f);
            CreateGroundContactPatch(root, "NoticeEntryContact", new Vector3(-2.65f, 0f, 1.2f), new Vector3(2.35f, 0.016f, 1.16f), new Color(0.24f, 0.2f, 0.16f), 0.86f);
            CreateGroundContactPatch(root, "NoticeRouteContactA", new Vector3(-3.45f, 0f, 1.68f), new Vector3(2.95f, 0.016f, 1.05f), new Color(0.23f, 0.19f, 0.15f), 0.9f);
            CreateGroundContactPatch(root, "NoticeRouteContactB", new Vector3(-4.08f, 0f, 2.12f), new Vector3(1.9f, 0.016f, 0.96f), new Color(0.24f, 0.2f, 0.16f), 0.86f);
            CreateGroundContactPatch(root, "NoticeBoardRearContact", new Vector3(-4.88f, 0f, 3.42f), new Vector3(2.3f, 0.015f, 1.4f), new Color(0.23f, 0.2f, 0.16f), 0.76f);
            CreateGroundContactPatch(root, "NoticeWorkerStepsContact", new Vector3(-4.85f, 0f, -0.68f), new Vector3(1.7f, 0.015f, 0.86f), new Color(0.23f, 0.19f, 0.16f), 0.84f);
            CreateGroundContactPatch(root, "NoticeCenterBenchContact", new Vector3(-0.75f, 0f, 1.65f), new Vector3(1.55f, 0.015f, 0.88f), new Color(0.24f, 0.21f, 0.17f), 0.82f);
            CreateGroundContactPatch(root, "WorkerHouseFrontContact", new Vector3(-4.92f, 0f, 0.05f), new Vector3(2.2f, 0.016f, 1.2f), new Color(0.22f, 0.18f, 0.15f), 0.8f);
            CreateGroundContactPatch(root, "CenterHouseFrontContact", new Vector3(-1.65f, 0f, 1.02f), new Vector3(2.1f, 0.016f, 1.0f), new Color(0.22f, 0.18f, 0.15f), 0.78f);
            CreateGroundContactPatch(root, "RightVillageContactA", new Vector3(4.8f, 0f, 0.25f), new Vector3(3.7f, 0.016f, 2.1f), new Color(0.2f, 0.17f, 0.14f), 0.82f);
            CreateGroundContactPatch(root, "RightVillageContactB", new Vector3(5.55f, 0f, 2.45f), new Vector3(3.25f, 0.015f, 1.8f), new Color(0.2f, 0.17f, 0.14f), 0.78f);
            if (UseDenseVillageClutter)
            {
                CreateRealisticVillageDetails(root);
            }

            if (UseExpandedVillageDistricts)
            {
                CreateExpandedVillageDistricts(root);
            }

            if (UseDenseVillageClutter)
            {
                CreateFullMapNaturalFill(root);
            }
        }

        private static void CreateTilePatch(Transform root, string label, Vector3 center, int columns, int rows, float tileSize, Color color)
        {
            var visibleY = ResolveTilePatchY(label, center.y);
            var tileHeight = ResolveTilePatchHeight(label);
            var patch = CreateVisualPiece(
                root,
                PrimitiveType.Cube,
                label + "_StablePatch",
                new Vector3(center.x, visibleY, center.z),
                new Vector3(columns * tileSize, tileHeight, rows * tileSize),
                color);
            StabilizeGroundRenderer(patch);
        }

        private static float ResolveTilePatchY(string label, float requestedY)
        {
            var lower = label.ToLowerInvariant();
            if (lower.Contains("road") || lower.Contains("lane") || lower.Contains("path"))
            {
                return Mathf.Max(requestedY, 0.075f);
            }

            if (lower.Contains("court") || lower.Contains("yard") || lower.Contains("beacon") || lower.Contains("archive") || lower.Contains("worker"))
            {
                return Mathf.Max(requestedY, 0.058f);
            }

            if (lower.Contains("village"))
            {
                return Mathf.Max(requestedY, 0.036f);
            }

            return Mathf.Max(requestedY, 0.014f);
        }

        private static float ResolveTilePatchHeight(string label)
        {
            var lower = label.ToLowerInvariant();
            if (lower.Contains("road") || lower.Contains("lane") || lower.Contains("path"))
            {
                return 0.028f;
            }

            if (lower.Contains("court") || lower.Contains("yard"))
            {
                return 0.024f;
            }

            return 0.02f;
        }

        private static void CreateGroundContactPatch(Transform root, string label, Vector3 center, Vector3 scale, Color color, float alpha)
        {
            var patch = CreateVisualPiece(
                root,
                PrimitiveType.Cylinder,
                label,
                new Vector3(center.x, 0.012f, center.z),
                new Vector3(scale.x * 0.5f, scale.y, scale.z * 0.5f),
                new Color(color.r, color.g, color.b, Mathf.Clamp01(alpha)));
            StabilizeGroundRenderer(patch);
        }

        private static void CreateGroundZonePatch(Transform root, string label, Vector3 center, Vector3 scale, Color color, float y)
        {
            var patch = CreateVisualPiece(
                root,
                PrimitiveType.Cylinder,
                label,
                new Vector3(center.x, y, center.z),
                new Vector3(scale.x * 0.5f, scale.y, scale.z * 0.5f),
                color);
            StabilizeGroundRenderer(patch);
        }

        private static void CreateVillageBuilding(Transform root, string label, Vector3 basePosition, Vector3 size, Color wallColor, Color roofColor, bool archiveDetails)
        {
            var lowerLabel = label.ToLowerInvariant();
            var isUtilityBuilding = lowerLabel.Contains("store") || lowerLabel.Contains("shed") || lowerLabel.Contains("workshop") || lowerLabel.Contains("warehouse") || lowerLabel.Contains("barn") || lowerLabel.Contains("pump");
            var isSmallOutbuilding = lowerLabel.Contains("hut") || lowerLabel.Contains("shed");
            var footprintScale = isSmallOutbuilding ? 1.02f : isUtilityBuilding ? 1.08f : 1.12f;
            var foundationColor = archiveDetails
                ? new Color(0.38f, 0.36f, 0.33f)
                : isUtilityBuilding
                    ? new Color(0.34f, 0.32f, 0.29f)
                    : new Color(0.32f, 0.29f, 0.26f);
            var floorTileColor = archiveDetails
                ? new Color(0.6f, 0.55f, 0.46f)
                : isUtilityBuilding
                    ? new Color(0.5f, 0.45f, 0.37f)
                    : new Color(0.54f, 0.46f, 0.36f);
            var trimColor = archiveDetails
                ? new Color(0.7f, 0.62f, 0.47f)
                : isUtilityBuilding
                    ? new Color(0.58f, 0.52f, 0.4f)
                    : new Color(0.62f, 0.53f, 0.39f);
            var deckColor = archiveDetails
                ? new Color(0.5f, 0.43f, 0.34f)
                : isUtilityBuilding
                    ? new Color(0.5f, 0.42f, 0.32f)
                    : new Color(0.54f, 0.44f, 0.33f);
            size = new Vector3(size.x * footprintScale, size.y * 1.22f, size.z * footprintScale);
            wallColor = archiveDetails
                ? Color.Lerp(wallColor, new Color(0.66f, 0.59f, 0.49f), 0.62f)
                : isUtilityBuilding
                    ? Color.Lerp(wallColor, new Color(0.48f, 0.44f, 0.38f), 0.48f)
                    : Color.Lerp(wallColor, new Color(0.6f, 0.49f, 0.36f), 0.38f);
            roofColor = archiveDetails
                ? Color.Lerp(roofColor, new Color(0.14f, 0.17f, 0.19f), 0.86f)
                : Color.Lerp(roofColor, new Color(0.16f, 0.14f, 0.12f), 0.84f);

            CreateVisualPiece(root, PrimitiveType.Cube, label + "_FoundationPad", basePosition + new Vector3(0f, 0.04f, 0f), new Vector3(size.x + 0.55f, 0.08f, size.z + 0.55f), foundationColor);
            CreateVisualPiece(root, PrimitiveType.Cube, label + "_FloorTile", basePosition + new Vector3(0f, 0.095f, 0f), new Vector3(size.x + 0.32f, 0.08f, size.z + 0.32f), floorTileColor);
            CreateVisualPiece(root, PrimitiveType.Cube, label + "_WallBack", basePosition + new Vector3(0f, size.y * 0.5f, size.z * 0.46f), new Vector3(size.x, size.y, 0.16f), wallColor);
            CreateVisualPiece(root, PrimitiveType.Cube, label + "_WallLeft", basePosition + new Vector3(-size.x * 0.46f, size.y * 0.5f, 0f), new Vector3(0.16f, size.y, size.z), wallColor * 0.94f);
            CreateVisualPiece(root, PrimitiveType.Cube, label + "_WallRight", basePosition + new Vector3(size.x * 0.46f, size.y * 0.5f, 0f), new Vector3(0.16f, size.y, size.z), wallColor * 0.98f);
            CreateVisualPiece(root, PrimitiveType.Cube, label + "_WallFrontLeft", basePosition + new Vector3(-size.x * 0.28f, size.y * 0.5f, -size.z * 0.46f), new Vector3(size.x * 0.38f, size.y, 0.14f), wallColor * 1.03f);
            CreateVisualPiece(root, PrimitiveType.Cube, label + "_WallFrontRight", basePosition + new Vector3(size.x * 0.28f, size.y * 0.5f, -size.z * 0.46f), new Vector3(size.x * 0.38f, size.y, 0.14f), wallColor * 1.03f);

            CreateVisualPiece(root, PrimitiveType.Cube, label + "_FrontGableFill", basePosition + new Vector3(0f, size.y + 0.1f, -size.z * 0.47f), new Vector3(size.x * 0.62f, 0.22f, 0.08f), wallColor * 1.06f);
            CreateVisualPiece(root, PrimitiveType.Cube, label + "_BackGableFill", basePosition + new Vector3(0f, size.y + 0.09f, size.z * 0.47f), new Vector3(size.x * 0.62f, 0.2f, 0.08f), wallColor * 0.95f);
            var roofAngle = isUtilityBuilding ? 10.5f : 16f;
            var roofDepth = UseDenseVillageClutter ? size.z + 0.2f : size.z + 0.06f;
            var roofA = CreateVisualPiece(root, PrimitiveType.Cube, label + "_RoofA", basePosition + new Vector3(-size.x * 0.16f, size.y + 0.25f, 0f), new Vector3(size.x * 0.5f, 0.095f, roofDepth), roofColor);
            roofA.transform.localRotation = Quaternion.Euler(0f, 0f, -roofAngle);
            var roofB = CreateVisualPiece(root, PrimitiveType.Cube, label + "_RoofB", basePosition + new Vector3(size.x * 0.16f, size.y + 0.25f, 0f), new Vector3(size.x * 0.5f, 0.095f, roofDepth), roofColor * 0.92f);
            roofB.transform.localRotation = Quaternion.Euler(0f, 0f, roofAngle);
            CreateVisualPiece(root, PrimitiveType.Cube, label + "_RoofRidge", basePosition + new Vector3(0f, size.y + 0.41f, 0f), new Vector3(0.08f, 0.085f, roofDepth + 0.04f), roofColor * 0.68f);
            if (UseDenseVillageClutter)
            {
                CreateRoofSurfaceDetail(root, label, basePosition, size, roofColor, roofAngle);
                CreateVisualPiece(root, PrimitiveType.Cube, label + "_FrontEave", basePosition + new Vector3(0f, size.y + 0.06f, -size.z * 0.58f), new Vector3(size.x + 0.16f, 0.055f, 0.1f), roofColor * 0.82f);
                CreateVisualPiece(root, PrimitiveType.Cube, label + "_BackEave", basePosition + new Vector3(0f, size.y + 0.055f, size.z * 0.58f), new Vector3(size.x + 0.12f, 0.055f, 0.1f), roofColor * 0.78f);
            }
            CreateVisualPiece(root, PrimitiveType.Cube, label + "_Chimney", basePosition + new Vector3(size.x * 0.3f, size.y + 0.55f, size.z * 0.08f), new Vector3(0.16f, 0.38f, 0.16f), new Color(0.28f, 0.25f, 0.21f));
            CreateVisualPiece(root, PrimitiveType.Cube, label + "_ChimneyCap", basePosition + new Vector3(size.x * 0.3f, size.y + 0.78f, size.z * 0.08f), new Vector3(0.24f, 0.06f, 0.22f), new Color(0.2f, 0.18f, 0.16f));
            if (isUtilityBuilding)
            {
                if (UseDenseVillageClutter)
                {
                    CreateVisualPiece(root, PrimitiveType.Cube, label + "_SideLeanToRoof", basePosition + new Vector3(-size.x * 0.55f, 0.84f, size.z * 0.08f), new Vector3(0.3f, 0.05f, size.z * 0.42f), roofColor * 0.72f).transform.localRotation = Quaternion.Euler(0f, 0f, -5f);
                    CreateVisualPiece(root, PrimitiveType.Cube, label + "_SideLeanToWall", basePosition + new Vector3(-size.x * 0.63f, 0.47f, size.z * 0.08f), new Vector3(0.12f, 0.62f, size.z * 0.55f), wallColor * 0.82f);
                }
            }

            CreateVisualPiece(root, PrimitiveType.Cube, label + "_DoorwayShadow", basePosition + new Vector3(0f, 0.52f, -size.z * 0.565f), new Vector3(0.46f, 0.82f, 0.035f), new Color(0.09f, 0.085f, 0.075f));
            var doorLeft = CreateVisualPiece(root, PrimitiveType.Cube, label + "_OpenDoorLeft", basePosition + new Vector3(-0.33f, 0.52f, -size.z * 0.59f), new Vector3(0.31f, 0.82f, 0.055f), new Color(0.25f, 0.2f, 0.15f));
            doorLeft.transform.localRotation = Quaternion.Euler(0f, -58f, 0f);
            var doorRight = CreateVisualPiece(root, PrimitiveType.Cube, label + "_OpenDoorRight", basePosition + new Vector3(0.33f, 0.52f, -size.z * 0.59f), new Vector3(0.31f, 0.82f, 0.055f), new Color(0.24f, 0.19f, 0.14f));
            doorRight.transform.localRotation = Quaternion.Euler(0f, 58f, 0f);
            CreateVisualPiece(root, PrimitiveType.Cube, label + "_DoorFrameTop", basePosition + new Vector3(0f, 0.98f, -size.z * 0.56f), new Vector3(0.72f, 0.09f, 0.06f), trimColor);
            CreateVisualPiece(root, PrimitiveType.Cube, label + "_DoorFrameLeft", basePosition + new Vector3(-0.34f, 0.53f, -size.z * 0.56f), new Vector3(0.08f, 0.86f, 0.06f), trimColor);
            CreateVisualPiece(root, PrimitiveType.Cube, label + "_DoorFrameRight", basePosition + new Vector3(0.34f, 0.53f, -size.z * 0.56f), new Vector3(0.08f, 0.86f, 0.06f), trimColor);
            CreateWindowFrame(root, label + "_WindowL", basePosition + new Vector3(-size.x * 0.25f, 0.9f, -size.z * 0.555f));
            CreateWindowFrame(root, label + "_WindowR", basePosition + new Vector3(size.x * 0.25f, 0.9f, -size.z * 0.555f));
            CreateWindowFrame(root, label + "_SideWindow", basePosition + new Vector3(size.x * 0.535f, 0.86f, size.z * 0.08f), true);
            CreateVisualPiece(root, PrimitiveType.Cube, label + "_PorchDeck", basePosition + new Vector3(0f, 0.13f, -size.z * 0.82f), new Vector3(1.05f, 0.12f, 0.46f), deckColor);
            CreateVisualPiece(root, PrimitiveType.Cube, label + "_PorchRoof", basePosition + new Vector3(0f, 1.16f, -size.z * 0.78f), new Vector3(1.05f, 0.055f, 0.38f), roofColor * 0.82f).transform.localRotation = Quaternion.Euler(-3f, 0f, 0f);
            CreateVisualPiece(root, PrimitiveType.Cylinder, label + "_PorchPostL", basePosition + new Vector3(-0.52f, 0.66f, -size.z * 0.93f), new Vector3(0.045f, 0.58f, 0.045f), trimColor * 0.88f);
            CreateVisualPiece(root, PrimitiveType.Cylinder, label + "_PorchPostR", basePosition + new Vector3(0.52f, 0.66f, -size.z * 0.93f), new Vector3(0.045f, 0.58f, 0.045f), trimColor * 0.88f);
            CreateVisualPiece(root, PrimitiveType.Cube, label + "_Step", basePosition + new Vector3(0f, 0.09f, -size.z * 1.02f), new Vector3(0.92f, 0.12f, 0.32f), floorTileColor * 0.92f);
            CreateCollisionBlocker(root, label + "_BackWallCollision", basePosition + new Vector3(0f, size.y * 0.5f, size.z * 0.46f), new Vector3(size.x, size.y, 0.24f));
            CreateCollisionBlocker(root, label + "_LeftWallCollision", basePosition + new Vector3(-size.x * 0.46f, size.y * 0.5f, 0f), new Vector3(0.24f, size.y, size.z));
            CreateCollisionBlocker(root, label + "_RightWallCollision", basePosition + new Vector3(size.x * 0.46f, size.y * 0.5f, 0f), new Vector3(0.24f, size.y, size.z));
            CreateCollisionBlocker(root, label + "_FrontWallLeftCollision", basePosition + new Vector3(-size.x * 0.28f, size.y * 0.5f, -size.z * 0.46f), new Vector3(size.x * 0.38f, size.y, 0.22f));
            CreateCollisionBlocker(root, label + "_FrontWallRightCollision", basePosition + new Vector3(size.x * 0.28f, size.y * 0.5f, -size.z * 0.46f), new Vector3(size.x * 0.38f, size.y, 0.22f));

            if (!archiveDetails)
            {
                return;
            }

            CreateVisualPiece(root, PrimitiveType.Cube, label + "_NoticeBoard", basePosition + new Vector3(size.x * 0.52f, 1.02f, -0.2f), new Vector3(0.08f, 0.5f, 0.42f), new Color(0.48f, 0.42f, 0.29f));
            CreateVisualPiece(root, PrimitiveType.Cube, label + "_PaperMarkA", basePosition + new Vector3(size.x * 0.565f, 1.08f, -0.27f), new Vector3(0.035f, 0.17f, 0.12f), new Color(0.74f, 0.7f, 0.61f));
            CreateVisualPiece(root, PrimitiveType.Cube, label + "_PaperMarkB", basePosition + new Vector3(size.x * 0.565f, 0.92f, -0.06f), new Vector3(0.035f, 0.13f, 0.15f), new Color(0.67f, 0.64f, 0.56f));
        }

        private static void CreateWindowFrame(Transform root, string label, Vector3 center, bool sideWindow = false)
        {
            var glassColor = new Color(0.58f, 0.66f, 0.68f);
            var frameColor = new Color(0.7f, 0.6f, 0.44f);
            var paneScale = sideWindow ? new Vector3(0.055f, 0.32f, 0.3f) : new Vector3(0.32f, 0.32f, 0.055f);
            var horizontalScale = sideWindow ? new Vector3(0.06f, 0.055f, 0.4f) : new Vector3(0.42f, 0.055f, 0.06f);
            var verticalScale = sideWindow ? new Vector3(0.06f, 0.4f, 0.055f) : new Vector3(0.055f, 0.4f, 0.06f);
            CreateVisualPiece(root, PrimitiveType.Cube, label + "_Glass", center, paneScale, glassColor);
            CreateVisualPiece(root, PrimitiveType.Cube, label + "_FrameTop", center + new Vector3(0f, 0.2f, 0f), horizontalScale, frameColor);
            CreateVisualPiece(root, PrimitiveType.Cube, label + "_FrameBottom", center + new Vector3(0f, -0.2f, 0f), horizontalScale, frameColor);
            CreateVisualPiece(root, PrimitiveType.Cube, label + "_FrameLeft", center + (sideWindow ? new Vector3(0f, 0f, -0.2f) : new Vector3(-0.2f, 0f, 0f)), verticalScale, frameColor);
            CreateVisualPiece(root, PrimitiveType.Cube, label + "_FrameRight", center + (sideWindow ? new Vector3(0f, 0f, 0.2f) : new Vector3(0.2f, 0f, 0f)), verticalScale, frameColor);
            CreateVisualPiece(root, PrimitiveType.Cube, label + "_Cross", center, sideWindow ? new Vector3(0.065f, 0.035f, 0.32f) : new Vector3(0.32f, 0.035f, 0.065f), frameColor * 0.9f);
            CreateVisualPiece(root, PrimitiveType.Cube, label + "_Sill", center + new Vector3(0f, -0.24f, 0f), sideWindow ? new Vector3(0.08f, 0.04f, 0.44f) : new Vector3(0.46f, 0.04f, 0.08f), frameColor * 0.88f);
        }

        private static void CreateRoofSurfaceDetail(Transform root, string label, Vector3 basePosition, Vector3 size, Color roofColor, float roofAngle)
        {
            var stripColor = roofColor * 0.74f;
            var capColor = roofColor * 1.08f;
            for (var index = 0; index < 3; index++)
            {
                var z = Mathf.Lerp(-size.z * 0.32f, size.z * 0.32f, index / 2f);
                var leftStrip = CreateVisualPiece(
                    root,
                    PrimitiveType.Cube,
                    label + "_RoofLeftSeam_" + index,
                    basePosition + new Vector3(-size.x * 0.17f, size.y + 0.315f, z),
                    new Vector3(size.x * 0.42f, 0.018f, 0.035f),
                    stripColor);
                leftStrip.transform.localRotation = Quaternion.Euler(0f, 0f, -roofAngle);

                var rightStrip = CreateVisualPiece(
                    root,
                    PrimitiveType.Cube,
                    label + "_RoofRightSeam_" + index,
                    basePosition + new Vector3(size.x * 0.17f, size.y + 0.315f, z),
                    new Vector3(size.x * 0.42f, 0.018f, 0.035f),
                    stripColor * 0.94f);
                rightStrip.transform.localRotation = Quaternion.Euler(0f, 0f, roofAngle);
            }

            var frontCap = CreateVisualPiece(root, PrimitiveType.Cube, label + "_RoofFrontCap", basePosition + new Vector3(0f, size.y + 0.19f, -size.z * 0.59f), new Vector3(size.x * 0.86f, 0.035f, 0.045f), capColor);
            frontCap.transform.localRotation = Quaternion.Euler(0f, 0f, 0f);
            var backCap = CreateVisualPiece(root, PrimitiveType.Cube, label + "_RoofBackCap", basePosition + new Vector3(0f, size.y + 0.185f, size.z * 0.59f), new Vector3(size.x * 0.82f, 0.035f, 0.045f), roofColor * 0.86f);
            backCap.transform.localRotation = Quaternion.Euler(0f, 0f, 0f);
        }

        private static void CreatePerimeterWall(Transform root, string label, Vector3 from, Vector3 to, Color color)
        {
            var horizontal = Mathf.Abs(to.x - from.x) >= Mathf.Abs(to.z - from.z);
            var length = Vector3.Distance(from, to);
            var center = (from + to) * 0.5f;
            CreateVisualPiece(root, PrimitiveType.Cube, label + "_BaseWall", center + new Vector3(0f, 0.42f, 0f), horizontal ? new Vector3(length, 0.82f, 0.18f) : new Vector3(0.18f, 0.82f, length), color);
            CreateVisualPiece(root, PrimitiveType.Cube, label + "_Cap", center + new Vector3(0f, 0.88f, 0f), horizontal ? new Vector3(length + 0.15f, 0.16f, 0.26f) : new Vector3(0.26f, 0.16f, length + 0.15f), color * 0.86f);
            CreateCollisionBlocker(root, label + "_Collision", center + new Vector3(0f, 0.55f, 0f), horizontal ? new Vector3(length, 1.1f, 0.42f) : new Vector3(0.42f, 1.1f, length));
        }

        private static void CreateVillageGate(Transform root, string label, Vector3 basePosition, Color color)
        {
            CreateVisualPiece(root, PrimitiveType.Cube, label + "_PostL", basePosition + new Vector3(-0.72f, 0.72f, 0f), new Vector3(0.18f, 1.44f, 0.2f), color);
            CreateVisualPiece(root, PrimitiveType.Cube, label + "_PostR", basePosition + new Vector3(0.72f, 0.72f, 0f), new Vector3(0.18f, 1.44f, 0.2f), color);
            CreateVisualPiece(root, PrimitiveType.Cube, label + "_Beam", basePosition + new Vector3(0f, 1.46f, 0f), new Vector3(1.65f, 0.2f, 0.22f), color * 0.9f);
            CreateVisualPiece(root, PrimitiveType.Cube, label + "_OpenDoorL", basePosition + new Vector3(-0.35f, 0.47f, -0.25f), new Vector3(0.42f, 0.82f, 0.08f), color * 0.75f).transform.localRotation = Quaternion.Euler(0f, 24f, 0f);
            CreateVisualPiece(root, PrimitiveType.Cube, label + "_OpenDoorR", basePosition + new Vector3(0.35f, 0.47f, -0.25f), new Vector3(0.42f, 0.82f, 0.08f), color * 0.78f).transform.localRotation = Quaternion.Euler(0f, -24f, 0f);
            CreateCollisionBlocker(root, label + "_PostLCollision", basePosition + new Vector3(-0.72f, 0.72f, 0f), new Vector3(0.28f, 1.44f, 0.36f));
            CreateCollisionBlocker(root, label + "_PostRCollision", basePosition + new Vector3(0.72f, 0.72f, 0f), new Vector3(0.28f, 1.44f, 0.36f));
        }

        private static void CreateAuthorityCheckpoint(Transform root)
        {
            var darkWood = new Color(0.25f, 0.21f, 0.16f);
            var agedPaper = new Color(0.72f, 0.67f, 0.54f);
            var warningOchre = new Color(0.62f, 0.51f, 0.28f);
            var mutedMetal = new Color(0.29f, 0.31f, 0.31f);

            CreateVisualPiece(root, PrimitiveType.Cube, "AuthorityNoticeBackdropWall", new Vector3(-4.55f, 0.94f, 2.7f), new Vector3(3.05f, 1.88f, 0.2f), new Color(0.29f, 0.26f, 0.21f));
            CreateVisualPiece(root, PrimitiveType.Cube, "AuthorityNoticeBackShadow", new Vector3(-4.55f, 0.9f, 2.84f), new Vector3(3.35f, 1.86f, 0.12f), new Color(0.18f, 0.16f, 0.13f));
            CreateVisualPiece(root, PrimitiveType.Cube, "AuthorityNoticeLeftPost", new Vector3(-6.18f, 1.08f, 2.58f), new Vector3(0.2f, 2.16f, 0.26f), darkWood * 0.9f);
            CreateVisualPiece(root, PrimitiveType.Cube, "AuthorityNoticeRightPost", new Vector3(-2.92f, 1.08f, 2.58f), new Vector3(0.2f, 2.16f, 0.26f), darkWood * 0.9f);
            CreateVisualPiece(root, PrimitiveType.Cube, "AuthorityNoticeHeaderBeam", new Vector3(-4.55f, 1.88f, 2.56f), new Vector3(3.35f, 0.2f, 0.3f), darkWood);
            CreateVisualPiece(root, PrimitiveType.Cube, "AuthorityNoticeLintel", new Vector3(-4.55f, 2.14f, 2.54f), new Vector3(2.72f, 0.13f, 0.23f), warningOchre * 0.82f);
            CreateVisualPiece(root, PrimitiveType.Cube, "AuthorityNoticePrimaryPaper", new Vector3(-4.62f, 1.08f, 2.46f), new Vector3(0.98f, 0.78f, 0.055f), agedPaper);
            CreateVisualPiece(root, PrimitiveType.Cube, "AuthorityNoticeSecondaryPaper", new Vector3(-3.86f, 1.0f, 2.43f), new Vector3(0.46f, 0.5f, 0.052f), agedPaper * 0.88f);
            CreateVisualPiece(root, PrimitiveType.Cube, "AuthorityNoticeBlackBarA", new Vector3(-4.64f, 1.28f, 2.39f), new Vector3(0.66f, 0.055f, 0.04f), mutedMetal);
            CreateVisualPiece(root, PrimitiveType.Cube, "AuthorityNoticeBlackBarB", new Vector3(-4.64f, 1.12f, 2.39f), new Vector3(0.78f, 0.045f, 0.04f), mutedMetal);
            CreateVisualPiece(root, PrimitiveType.Cube, "AuthorityNoticeBlackBarC", new Vector3(-4.64f, 0.95f, 2.39f), new Vector3(0.52f, 0.045f, 0.04f), mutedMetal);
            CreateVisualPiece(root, PrimitiveType.Cube, "AuthorityNoticeSeal", new Vector3(-5.18f, 1.1f, 2.38f), new Vector3(0.18f, 0.18f, 0.055f), warningOchre);
            CreateVisualPiece(root, PrimitiveType.Cube, "RouteLimitStripeA", new Vector3(-3.1f, 0.105f, 1.36f), new Vector3(1.8f, 0.045f, 0.075f), warningOchre * 0.78f);
            CreateVisualPiece(root, PrimitiveType.Cube, "RouteLimitStripeB", new Vector3(-4.16f, 0.105f, 2.04f), new Vector3(1.7f, 0.045f, 0.075f), warningOchre * 0.7f);
            CreateVisualPiece(root, PrimitiveType.Cube, "RouteLimitStripeC", new Vector3(-3.58f, 0.107f, 1.68f), new Vector3(2.45f, 0.042f, 0.06f), warningOchre * 0.58f).transform.localRotation = Quaternion.Euler(0f, -32f, 0f);
            CreateVisualPiece(root, PrimitiveType.Cube, "CheckpointBench", new Vector3(-3.55f, 0.25f, 1.92f), new Vector3(1.15f, 0.18f, 0.38f), darkWood * 1.08f);
            CreateVisualPiece(root, PrimitiveType.Cube, "CheckpointBenchLegL", new Vector3(-3.92f, 0.13f, 1.82f), new Vector3(0.12f, 0.26f, 0.12f), darkWood * 0.9f);
            CreateVisualPiece(root, PrimitiveType.Cube, "CheckpointBenchLegR", new Vector3(-3.18f, 0.13f, 2.02f), new Vector3(0.12f, 0.26f, 0.12f), darkWood * 0.9f);
            CreateVisualPiece(root, PrimitiveType.Cube, "QueuePostA", new Vector3(-2.24f, 0.48f, 0.92f), new Vector3(0.09f, 0.96f, 0.09f), mutedMetal);
            CreateVisualPiece(root, PrimitiveType.Cube, "QueuePostB", new Vector3(-3.12f, 0.48f, 1.48f), new Vector3(0.09f, 0.96f, 0.09f), mutedMetal);
            CreateVisualPiece(root, PrimitiveType.Cube, "QueuePostC", new Vector3(-4.0f, 0.48f, 2.02f), new Vector3(0.09f, 0.96f, 0.09f), mutedMetal);
            CreateVisualPiece(root, PrimitiveType.Cube, "QueueRailA", new Vector3(-2.68f, 0.72f, 1.2f), new Vector3(1.02f, 0.08f, 0.08f), mutedMetal * 0.92f).transform.localRotation = Quaternion.Euler(0f, -33f, 0f);
            CreateVisualPiece(root, PrimitiveType.Cube, "QueueRailB", new Vector3(-3.56f, 0.72f, 1.75f), new Vector3(1.02f, 0.08f, 0.08f), mutedMetal * 0.92f).transform.localRotation = Quaternion.Euler(0f, -33f, 0f);
            CreateVisualPiece(root, PrimitiveType.Cube, "ConfiscatedSupplyCrateA", new Vector3(-5.55f, 0.24f, 2.0f), new Vector3(0.58f, 0.48f, 0.5f), new Color(0.38f, 0.31f, 0.23f));
            CreateVisualPiece(root, PrimitiveType.Cube, "ConfiscatedSupplyCrateB", new Vector3(-5.18f, 0.18f, 1.48f), new Vector3(0.46f, 0.36f, 0.42f), new Color(0.35f, 0.29f, 0.22f));
            CreateVisualPiece(root, PrimitiveType.Cube, "RecoveryBoundaryMarker", new Vector3(-2.48f, 0.72f, 2.56f), new Vector3(0.16f, 1.44f, 0.16f), warningOchre * 0.9f);
            CreateVisualPiece(root, PrimitiveType.Cube, "RecoveryBoundaryArm", new Vector3(-2.86f, 1.24f, 2.56f), new Vector3(0.78f, 0.12f, 0.12f), warningOchre);
            CreateVisualPiece(root, PrimitiveType.Cube, "AuthoritySideScreenLeft", new Vector3(-6.28f, 0.72f, 2.0f), new Vector3(0.16f, 1.28f, 1.65f), new Color(0.26f, 0.23f, 0.18f));
            CreateVisualPiece(root, PrimitiveType.Cube, "AuthoritySideScreenRight", new Vector3(-2.72f, 0.64f, 2.35f), new Vector3(0.16f, 1.12f, 1.28f), new Color(0.25f, 0.23f, 0.19f));
        }

        private static void CreateFirstScreenBoundaryBreakers(Transform root)
        {
            var darkFence = new Color(0.27f, 0.24f, 0.19f);
            var deadGrass = new Color(0.34f, 0.36f, 0.25f);
            var noticeOchre = new Color(0.55f, 0.46f, 0.25f);

            CreatePerimeterWall(root, "FirstScreenRearFenceA", new Vector3(-6.35f, 0f, 3.28f), new Vector3(-4.82f, 0f, 3.98f), darkFence);
            CreatePerimeterWall(root, "FirstScreenRearFenceB", new Vector3(-3.72f, 0f, 4.22f), new Vector3(-1.8f, 0f, 4.85f), darkFence * 1.05f);
            CreatePerimeterWall(root, "FirstScreenRightFenceReturn", new Vector3(-2.08f, 0f, 2.72f), new Vector3(-2.08f, 0f, 4.68f), darkFence);
            CreateVisualPiece(root, PrimitiveType.Cube, "FirstScreenRearWarningBoard", new Vector3(-3.05f, 1.08f, 4.72f), new Vector3(0.95f, 0.5f, 0.08f), noticeOchre * 0.88f);
            CreateVisualPiece(root, PrimitiveType.Cube, "FirstScreenRearWarningBarA", new Vector3(-3.05f, 1.18f, 4.66f), new Vector3(0.65f, 0.045f, 0.055f), darkFence);
            CreateVisualPiece(root, PrimitiveType.Cube, "FirstScreenRearWarningBarB", new Vector3(-3.05f, 1.0f, 4.66f), new Vector3(0.45f, 0.04f, 0.055f), darkFence);
            CreateVisualPiece(root, PrimitiveType.Cube, "FirstScreenRearDarkLeanTo", new Vector3(-3.55f, 0.86f, 5.12f), new Vector3(3.2f, 1.36f, 0.16f), darkFence * 0.82f);
            CreateVisualPiece(root, PrimitiveType.Cube, "FirstScreenRearLowRoof", new Vector3(-3.55f, 1.58f, 5.02f), new Vector3(3.55f, 0.18f, 0.78f), darkFence * 1.12f);
            CreateVisualPiece(root, PrimitiveType.Cube, "FirstScreenRightReturnScreen", new Vector3(-1.72f, 0.72f, 3.86f), new Vector3(0.16f, 1.18f, 2.42f), darkFence * 0.92f);
            CreateGrassBorder(root, "FirstScreenRearRoughGrass", new Vector3(-4.8f, 0f, 4.55f), 7, new Vector3(0.66f, 0f, 0.08f), deadGrass);
            CreateGrassBorder(root, "FirstScreenLeftRoughGrass", new Vector3(-6.18f, 0f, 2.12f), 6, new Vector3(0.0f, 0f, 0.62f), deadGrass * 0.9f);
        }

        private static void CreateFieldRows(Transform root, string label, Vector3 basePosition, int rows, Color color)
        {
            for (var index = 0; index < rows; index++)
            {
                CreateVisualPiece(root, PrimitiveType.Cube, label + "_Row_" + index, basePosition + new Vector3(0f, 0.06f, index * 0.42f), new Vector3(2.25f, 0.08f, 0.16f), color * (1f - index * 0.025f));
            }
        }

        private static void CreateMarketAwning(Transform root, string label, Vector3 basePosition, Color color)
        {
            CreateVisualPiece(root, PrimitiveType.Cylinder, label + "_PoleA", basePosition + new Vector3(-0.55f, 0.65f, -0.42f), new Vector3(0.04f, 0.65f, 0.04f), color * 0.8f);
            CreateVisualPiece(root, PrimitiveType.Cylinder, label + "_PoleB", basePosition + new Vector3(0.55f, 0.65f, -0.42f), new Vector3(0.04f, 0.65f, 0.04f), color * 0.8f);
            CreateVisualPiece(root, PrimitiveType.Cylinder, label + "_PoleC", basePosition + new Vector3(-0.55f, 0.65f, 0.42f), new Vector3(0.04f, 0.65f, 0.04f), color * 0.8f);
            CreateVisualPiece(root, PrimitiveType.Cylinder, label + "_PoleD", basePosition + new Vector3(0.55f, 0.65f, 0.42f), new Vector3(0.04f, 0.65f, 0.04f), color * 0.8f);
            CreateVisualPiece(root, PrimitiveType.Cube, label + "_RoofCloth", basePosition + new Vector3(0f, 1.28f, 0f), new Vector3(1.35f, 0.08f, 1.05f), color);
            CreateVisualPiece(root, PrimitiveType.Cube, label + "_FrontTrim", basePosition + new Vector3(0f, 1.17f, -0.56f), new Vector3(1.3f, 0.14f, 0.06f), color * 0.9f);
        }

        private static void CreateGrassBorder(Transform root, string label, Vector3 startPosition, int count, Vector3 step, Color color)
        {
            for (var index = 0; index < count; index++)
            {
                var position = startPosition + step * index;
                var height = 0.22f + (index % 3) * 0.04f;
                CreateVisualPiece(root, PrimitiveType.Capsule, label + "_BladeA_" + index, position + new Vector3(0.03f, height * 0.5f, 0.0f), new Vector3(0.025f, height, 0.025f), color * (0.9f + (index % 4) * 0.04f)).transform.localRotation = Quaternion.Euler(0f, index * 17f, 8f);
                CreateVisualPiece(root, PrimitiveType.Capsule, label + "_BladeB_" + index, position + new Vector3(-0.07f, height * 0.45f, 0.08f), new Vector3(0.02f, height * 0.86f, 0.02f), color * 0.86f).transform.localRotation = Quaternion.Euler(0f, -index * 13f, -10f);
            }
        }

        private static void CreateWindmill(Transform root, string label, Vector3 basePosition, Color color)
        {
            CreateVisualPiece(root, PrimitiveType.Cube, label + "_Base", basePosition + new Vector3(0f, 0.16f, 0f), new Vector3(0.7f, 0.32f, 0.7f), color * 0.78f);
            CreateVisualPiece(root, PrimitiveType.Cylinder, label + "_Tower", basePosition + new Vector3(0f, 1.0f, 0f), new Vector3(0.18f, 0.92f, 0.18f), color);
            CreateVisualPiece(root, PrimitiveType.Cube, label + "_Head", basePosition + new Vector3(0f, 1.98f, -0.08f), new Vector3(0.48f, 0.34f, 0.42f), color * 0.92f);
            CreateVisualPiece(root, PrimitiveType.Cube, label + "_Roof", basePosition + new Vector3(0f, 2.28f, -0.08f), new Vector3(0.62f, 0.18f, 0.52f), new Color(0.28f, 0.3f, 0.28f));
            CreateVisualPiece(root, PrimitiveType.Cylinder, label + "_Hub", basePosition + new Vector3(0f, 1.98f, -0.34f), new Vector3(0.08f, 0.05f, 0.08f), new Color(0.58f, 0.52f, 0.36f));
            var bladeA = CreateVisualPiece(root, PrimitiveType.Cube, label + "_BladeA", basePosition + new Vector3(0f, 2.32f, -0.38f), new Vector3(0.09f, 0.72f, 0.035f), new Color(0.64f, 0.58f, 0.42f));
            bladeA.transform.localRotation = Quaternion.Euler(0f, 0f, 0f);
            var bladeB = CreateVisualPiece(root, PrimitiveType.Cube, label + "_BladeB", basePosition + new Vector3(0f, 1.64f, -0.38f), new Vector3(0.09f, 0.72f, 0.035f), new Color(0.64f, 0.58f, 0.42f));
            bladeB.transform.localRotation = Quaternion.Euler(0f, 0f, 180f);
            var bladeC = CreateVisualPiece(root, PrimitiveType.Cube, label + "_BladeC", basePosition + new Vector3(-0.34f, 1.98f, -0.38f), new Vector3(0.72f, 0.09f, 0.035f), new Color(0.6f, 0.54f, 0.39f));
            bladeC.transform.localRotation = Quaternion.Euler(0f, 0f, 0f);
            var bladeD = CreateVisualPiece(root, PrimitiveType.Cube, label + "_BladeD", basePosition + new Vector3(0.34f, 1.98f, -0.38f), new Vector3(0.72f, 0.09f, 0.035f), new Color(0.6f, 0.54f, 0.39f));
            bladeD.transform.localRotation = Quaternion.Euler(0f, 0f, 180f);
            CreateCollisionBlocker(root, label + "_Collision", basePosition + new Vector3(0f, 0.75f, 0f), new Vector3(0.8f, 1.5f, 0.8f));
        }

        private static void CreateRiverEdge(Transform root, string label, Vector3 startPosition, Color waterColor)
        {
            for (var index = 0; index < 18; index++)
            {
                var position = startPosition + new Vector3(Mathf.Sin(index * 0.7f) * 0.16f, 0f, index * 0.86f);
                var waterScale = UseDenseVillageClutter ? new Vector3(1.18f, 0.032f, 0.82f) : new Vector3(0.82f, 0.026f, 0.78f);
                var resolvedWaterColor = UseDenseVillageClutter ? waterColor * (1.08f + (index % 2) * 0.07f) : Color.Lerp(waterColor, new Color(0.18f, 0.28f, 0.31f), 0.55f);
                var water = CreateVisualPiece(root, PrimitiveType.Cube, label + "_Water_" + index, position + new Vector3(0f, 0.078f, 0f), waterScale, resolvedWaterColor);
                water.transform.localRotation = Quaternion.Euler(0f, Mathf.Sin(index * 0.9f) * 4f, 0f);
                if (UseDenseVillageClutter)
                {
                    CreateVisualPiece(root, PrimitiveType.Cube, label + "_WaterHighlight_" + index, position + new Vector3(-0.16f, 0.106f, -0.05f), new Vector3(0.34f, 0.01f, 0.44f), new Color(0.42f, 0.62f, 0.68f));
                }

                CreateVisualPiece(root, PrimitiveType.Cube, label + "_BankInner_" + index, position + new Vector3(-0.6f, 0.065f, 0f), new Vector3(0.18f, 0.11f, 0.82f), new Color(0.35f, 0.37f, 0.29f));
                CreateVisualPiece(root, PrimitiveType.Cube, label + "_BankOuter_" + index, position + new Vector3(0.6f, 0.06f, 0f), new Vector3(0.18f, 0.1f, 0.78f), new Color(0.3f, 0.35f, 0.3f));
            }

            CreateVisualPiece(root, PrimitiveType.Cube, label + "_FootBridgeA", startPosition + new Vector3(-0.05f, 0.18f, 2.75f), new Vector3(1.95f, 0.08f, 0.32f), new Color(0.43f, 0.34f, 0.23f));
            CreateVisualPiece(root, PrimitiveType.Cube, label + "_FootBridgeB", startPosition + new Vector3(-0.05f, 0.24f, 2.75f), new Vector3(1.65f, 0.06f, 0.12f), new Color(0.52f, 0.42f, 0.28f));
            CreateCollisionBlocker(root, label + "_OuterBankCollision", startPosition + new Vector3(0.74f, 0.4f, 7.35f), new Vector3(0.28f, 0.8f, 15.6f));
        }

        private static void CreateRealisticVillageDetails(Transform root)
        {
            CreateRoadShoulder(root, "MainRoadShoulderNorth", new Vector3(0.0f, 0f, -0.72f), new Vector3(9.4f, 0.04f, 0.28f), new Color(0.31f, 0.3f, 0.26f));
            CreateRoadShoulder(root, "MainRoadShoulderSouth", new Vector3(0.05f, 0f, -3.45f), new Vector3(9.8f, 0.04f, 0.3f), new Color(0.29f, 0.29f, 0.27f));
            CreateRoadShoulder(root, "CrossRoadShoulderWest", new Vector3(-2.25f, 0f, 0.45f), new Vector3(0.32f, 0.04f, 5.6f), new Color(0.33f, 0.31f, 0.26f));
            CreateRoadShoulder(root, "CrossRoadShoulderEast", new Vector3(0.65f, 0f, 0.45f), new Vector3(0.28f, 0.04f, 5.5f), new Color(0.34f, 0.32f, 0.27f));

            CreateFenceLine(root, "ArchiveYardFence", new Vector3(2.25f, 0f, 1.05f), new Vector3(5.15f, 0f, 1.05f), new Color(0.39f, 0.34f, 0.27f));
            CreateFenceLine(root, "WorkerYardFence", new Vector3(-5.35f, 0f, -1.25f), new Vector3(-2.95f, 0f, -1.25f), new Color(0.38f, 0.32f, 0.25f));
            CreateFenceLine(root, "FieldLowFence", new Vector3(-5.65f, 0f, 1.85f), new Vector3(-2.05f, 0f, 1.85f), new Color(0.39f, 0.34f, 0.25f));

            CreateTreeGrove(root, "NorthTreeGrove", new Vector3(-4.2f, 0f, 5.75f), 5, new Vector3(1.15f, 0f, -0.08f));
            CreateTreeGrove(root, "WestTreeGrove", new Vector3(-7.1f, 0f, -2.75f), 4, new Vector3(0f, 0f, 1.25f));
            CreateTreeGrove(root, "RiverTreeGrove", new Vector3(7.25f, 0f, 1.35f), 4, new Vector3(0.18f, 0f, 1.0f));

            CreateUtilityLine(root, "VillagePowerLineA", new Vector3(-4.9f, 0f, -3.9f), new Vector3(4.8f, 0f, -3.35f));
            CreateUtilityLine(root, "VillagePowerLineB", new Vector3(-3.85f, 0f, 3.95f), new Vector3(4.85f, 0f, 3.65f));

            CreatePorchDetails(root, "ArchivePorch", new Vector3(3.85f, 0f, 1.75f), new Color(0.36f, 0.31f, 0.24f));
            CreatePorchDetails(root, "WorkerPorch", new Vector3(-4.45f, 0f, -1.0f), new Color(0.37f, 0.29f, 0.21f));
            CreatePorchDetails(root, "NorthFarmPorch", new Vector3(-1.0f, 0f, 3.15f), new Color(0.35f, 0.3f, 0.23f));

            CreateBarrelCluster(root, "SupplyBarrels", new Vector3(-0.55f, 0f, -3.45f), new Color(0.32f, 0.31f, 0.28f));
            CreateBarrelCluster(root, "FarmWaterBarrels", new Vector3(-2.0f, 0f, 3.55f), new Color(0.28f, 0.34f, 0.35f));
            CreateLaundryLine(root, "VillageLaundry", new Vector3(-3.65f, 0f, 0.75f), new Vector3(-2.35f, 0f, 0.95f));
        }

        private static void CreateExpandedVillageDistricts(Transform root)
        {
            CreateTilePatch(root, "NorthFarmLane", new Vector3(-2.2f, -0.026f, 7.2f), 4, 8, 0.86f, new Color(0.4f, 0.38f, 0.31f));
            CreateTilePatch(root, "SouthEntryRoad", new Vector3(0.7f, -0.024f, -7.65f), 5, 8, 0.86f, new Color(0.32f, 0.32f, 0.31f));
            CreateTilePatch(root, "WestWorkshopYard", new Vector3(-8.7f, -0.028f, -1.2f), 6, 6, 0.82f, new Color(0.39f, 0.36f, 0.3f));
            CreateTilePatch(root, "EastRiverYard", new Vector3(8.25f, -0.028f, 0.55f), 5, 6, 0.82f, new Color(0.36f, 0.38f, 0.34f));

            CreateVillageBuilding(root, "NorthBarn", new Vector3(-4.25f, 0f, 8.35f), new Vector3(2.45f, 1.35f, 1.65f), new Color(0.43f, 0.35f, 0.27f), new Color(0.28f, 0.25f, 0.22f), false);
            CreateVillageBuilding(root, "NorthSmallHome", new Vector3(0.3f, 0f, 8.15f), new Vector3(1.85f, 1.15f, 1.35f), new Color(0.41f, 0.39f, 0.33f), new Color(0.28f, 0.29f, 0.26f), false);
            CreateVillageBuilding(root, "WestWorkshop", new Vector3(-9.25f, 0f, -1.05f), new Vector3(2.1f, 1.15f, 1.45f), new Color(0.35f, 0.33f, 0.3f), new Color(0.25f, 0.26f, 0.25f), false);
            CreateVillageBuilding(root, "RiverPumpHouse", new Vector3(9.3f, 0f, 1.75f), new Vector3(1.55f, 1.05f, 1.2f), new Color(0.34f, 0.37f, 0.35f), new Color(0.25f, 0.29f, 0.29f), false);
            CreateVillageBuilding(root, "ArchiveAnnex", new Vector3(6.05f, 0f, 4.65f), new Vector3(2.05f, 1.25f, 1.45f), new Color(0.36f, 0.39f, 0.38f), new Color(0.24f, 0.28f, 0.29f), true);
            CreateVillageBuilding(root, "SouthStorehouse", new Vector3(-2.9f, 0f, -8.45f), new Vector3(1.8f, 0.95f, 1.2f), new Color(0.39f, 0.34f, 0.27f), new Color(0.27f, 0.24f, 0.21f), false);
            CreateVillageBuilding(root, "SouthGateHouse", new Vector3(4.35f, 0f, -8.9f), new Vector3(1.35f, 0.92f, 1.05f), new Color(0.38f, 0.36f, 0.31f), new Color(0.25f, 0.26f, 0.24f), false);
            CreateVillageBuilding(root, "WestLonghouse", new Vector3(-11.85f, 0f, 2.25f), new Vector3(2.55f, 1.2f, 1.55f), new Color(0.37f, 0.34f, 0.29f), new Color(0.25f, 0.25f, 0.23f), false);
            CreateVillageBuilding(root, "RiverWarehouse", new Vector3(12.15f, 0f, -2.35f), new Vector3(2.25f, 1.2f, 1.55f), new Color(0.34f, 0.36f, 0.33f), new Color(0.22f, 0.25f, 0.25f), false);

            if (!UseDenseVillageClutter)
            {
                CreateFenceLine(root, "RiverSafetyFence", new Vector3(7.35f, 0f, -2.75f), new Vector3(7.35f, 0f, 4.75f), new Color(0.34f, 0.32f, 0.27f));
                CreateVillageGate(root, "SouthRoadGate", new Vector3(0.7f, 0f, -10.75f), new Color(0.38f, 0.32f, 0.24f));
                CreatePerimeterWall(root, "SouthOuterWallWest", new Vector3(-6.8f, 0f, -10.85f), new Vector3(-0.5f, 0f, -10.85f), new Color(0.32f, 0.32f, 0.31f));
                CreatePerimeterWall(root, "SouthOuterWallEast", new Vector3(1.9f, 0f, -10.85f), new Vector3(7.0f, 0f, -10.85f), new Color(0.32f, 0.32f, 0.31f));
                CreateRoadShoulder(root, "SouthRoadShoulderWest", new Vector3(-1.4f, 0f, -7.6f), new Vector3(0.32f, 0.04f, 5.4f), new Color(0.27f, 0.28f, 0.26f));
                CreateRoadShoulder(root, "SouthRoadShoulderEast", new Vector3(2.75f, 0f, -7.6f), new Vector3(0.32f, 0.04f, 5.4f), new Color(0.27f, 0.28f, 0.26f));
                CreateRoadShoulder(root, "WestVillageConnector", new Vector3(-8.4f, 0f, 1.25f), new Vector3(5.3f, 0.04f, 0.34f), new Color(0.31f, 0.3f, 0.26f));
                CreateRoadShoulder(root, "EastRiverConnector", new Vector3(8.65f, 0f, -1.25f), new Vector3(5.8f, 0.04f, 0.34f), new Color(0.3f, 0.31f, 0.29f));
                CreateRoadShoulder(root, "NorthAnnexConnector", new Vector3(5.65f, 0f, 3.25f), new Vector3(0.34f, 0.04f, 3.4f), new Color(0.31f, 0.31f, 0.28f));
                CreateTreeGrove(root, "NorthFarTreeLine", new Vector3(-8.8f, 0f, 10.75f), 4, new Vector3(2.25f, 0f, 0.08f));
                CreateTreeGrove(root, "SouthRoadTreeLine", new Vector3(-6.2f, 0f, -9.4f), 3, new Vector3(2.35f, 0f, -0.08f));
                return;
            }

            CreateFieldRows(root, "NorthExpandedFieldA", new Vector3(-7.2f, 0f, 6.6f), 8, new Color(0.38f, 0.4f, 0.27f));
            CreateFieldRows(root, "NorthExpandedFieldB", new Vector3(-6.25f, 0f, 6.4f), 8, new Color(0.39f, 0.38f, 0.26f));
            CreateFenceLine(root, "NorthDistrictFenceA", new Vector3(-8.25f, 0f, 5.65f), new Vector3(2.0f, 0f, 5.65f), new Color(0.39f, 0.34f, 0.25f));
            CreateFenceLine(root, "NorthDistrictFenceB", new Vector3(-8.25f, 0f, 10.0f), new Vector3(1.65f, 0f, 10.0f), new Color(0.36f, 0.32f, 0.24f));

            CreateCrateStack(root, "WestWorkshopCratesA", new Vector3(-8.05f, 0f, -2.05f), new Color(0.36f, 0.31f, 0.25f));
            CreateCrateStack(root, "WestWorkshopCratesB", new Vector3(-10.15f, 0f, -0.25f), new Color(0.33f, 0.3f, 0.26f));
            CreateBarrelCluster(root, "WestWorkshopBarrels", new Vector3(-8.4f, 0f, 0.45f), new Color(0.31f, 0.31f, 0.29f));
            CreateUtilityLine(root, "WestUtilityLine", new Vector3(-10.35f, 0f, -3.4f), new Vector3(-3.8f, 0f, -3.9f));
            CreateCrateStack(root, "SouthStorehouseCrates", new Vector3(-1.7f, 0f, -7.35f), new Color(0.35f, 0.31f, 0.25f));
            CreateBarrelCluster(root, "SouthGateWaterCans", new Vector3(4.9f, 0f, -7.8f), new Color(0.25f, 0.32f, 0.34f));
            CreateCrateStack(root, "RiverWarehouseCrates", new Vector3(11.05f, 0f, -1.45f), new Color(0.31f, 0.33f, 0.29f));
            CreatePorchDetails(root, "ArchiveAnnexPorch", new Vector3(6.05f, 0f, 3.72f), new Color(0.34f, 0.31f, 0.25f));
            CreatePorchDetails(root, "SouthStorehousePorch", new Vector3(-2.9f, 0f, -8.88f), new Color(0.35f, 0.29f, 0.22f));

            CreateRiverEdge(root, "FarEastRiver", new Vector3(11.2f, 0f, -5.65f), new Color(0.22f, 0.39f, 0.48f));
            CreateFenceLine(root, "RiverSafetyFence", new Vector3(7.35f, 0f, -2.75f), new Vector3(7.35f, 0f, 4.75f), new Color(0.34f, 0.32f, 0.27f));
            CreatePorchDetails(root, "PumpHousePorch", new Vector3(9.3f, 0f, 0.82f), new Color(0.34f, 0.3f, 0.24f));
            CreateBarrelCluster(root, "RiverWaterTanks", new Vector3(8.3f, 0f, 2.8f), new Color(0.25f, 0.33f, 0.36f));

            CreateVillageGate(root, "SouthRoadGate", new Vector3(0.7f, 0f, -10.75f), new Color(0.38f, 0.32f, 0.24f));
            CreatePerimeterWall(root, "SouthOuterWallWest", new Vector3(-6.8f, 0f, -10.85f), new Vector3(-0.5f, 0f, -10.85f), new Color(0.32f, 0.32f, 0.31f));
            CreatePerimeterWall(root, "SouthOuterWallEast", new Vector3(1.9f, 0f, -10.85f), new Vector3(7.0f, 0f, -10.85f), new Color(0.32f, 0.32f, 0.31f));
            CreateRoadShoulder(root, "SouthRoadShoulderWest", new Vector3(-1.4f, 0f, -7.6f), new Vector3(0.32f, 0.04f, 5.4f), new Color(0.27f, 0.28f, 0.26f));
            CreateRoadShoulder(root, "SouthRoadShoulderEast", new Vector3(2.75f, 0f, -7.6f), new Vector3(0.32f, 0.04f, 5.4f), new Color(0.27f, 0.28f, 0.26f));
            CreateRoadShoulder(root, "WestVillageConnector", new Vector3(-8.4f, 0f, 1.25f), new Vector3(5.3f, 0.04f, 0.34f), new Color(0.31f, 0.3f, 0.26f));
            CreateRoadShoulder(root, "EastRiverConnector", new Vector3(8.65f, 0f, -1.25f), new Vector3(5.8f, 0.04f, 0.34f), new Color(0.3f, 0.31f, 0.29f));
            CreateRoadShoulder(root, "NorthAnnexConnector", new Vector3(5.65f, 0f, 3.25f), new Vector3(0.34f, 0.04f, 3.4f), new Color(0.31f, 0.31f, 0.28f));

            CreateTreeGrove(root, "NorthFarTreeLine", new Vector3(-8.8f, 0f, 10.75f), 8, new Vector3(1.25f, 0f, 0.05f));
            CreateTreeGrove(root, "SouthRoadTreeLine", new Vector3(-6.2f, 0f, -9.4f), 6, new Vector3(1.35f, 0f, -0.05f));
            CreateGrassBorder(root, "NorthDistrictGrass", new Vector3(-8.7f, 0f, 9.85f), 14, new Vector3(0.74f, 0f, 0.03f), new Color(0.3f, 0.38f, 0.25f));
            CreateGrassBorder(root, "SouthRoadGrass", new Vector3(-4.9f, 0f, -9.15f), 12, new Vector3(0.78f, 0f, -0.04f), new Color(0.29f, 0.36f, 0.26f));
        }

        private static void CreateNaturalLight(Transform root)
        {
            var lightObject = new GameObject("NaturalVillageSun");
            lightObject.transform.SetParent(root, false);
            lightObject.transform.localRotation = Quaternion.Euler(34f, -32f, 0f);
            var light = lightObject.AddComponent<Light>();
            light.type = LightType.Directional;
            light.color = new Color(1f, 0.91f, 0.8f);
            light.intensity = 1.1f;
            light.shadows = LightShadows.Soft;
            light.shadowStrength = 0.82f;
            light.shadowBias = 0.04f;
            light.shadowNormalBias = 0.38f;
        }

        private static void CreateRoadShoulder(Transform root, string label, Vector3 basePosition, Vector3 scale, Color color)
        {
            var piece = CreateVisualPiece(root, PrimitiveType.Cube, label, basePosition + new Vector3(0f, 0.035f, 0f), scale, color);
            StabilizeGroundRenderer(piece);
        }

        private static void CreateTreeGrove(Transform root, string label, Vector3 startPosition, int count, Vector3 step)
        {
            for (var index = 0; index < count; index++)
            {
                var position = startPosition + step * index + new Vector3(Mathf.Sin(index * 1.3f) * 0.18f, 0f, Mathf.Cos(index * 0.9f) * 0.12f);
                CreateRealTree(root, label + "_" + index, position, 0.88f + (index % 3) * 0.12f);
            }
        }

        private static void CreateFullMapNaturalFill(Transform root)
        {
            CreateTilePatch(root, "NorthRecoveryMeadow", new Vector3(-5.8f, -0.04f, 13.1f), 15, 5, 0.9f, new Color(0.3f, 0.38f, 0.25f));
            CreateTilePatch(root, "SouthRecoveryMeadow", new Vector3(2.0f, -0.04f, -13.8f), 13, 5, 0.9f, new Color(0.28f, 0.35f, 0.26f));
            CreateTilePatch(root, "WestRecoveryField", new Vector3(-14.1f, -0.04f, 1.6f), 5, 15, 0.9f, new Color(0.31f, 0.37f, 0.25f));
            CreateTilePatch(root, "EastRiverBankField", new Vector3(13.4f, -0.04f, 1.8f), 5, 15, 0.9f, new Color(0.29f, 0.36f, 0.3f));
            CreateRiverEdge(root, "ContinuousEastRiver", new Vector3(10.95f, 0f, -12.2f), new Color(0.2f, 0.37f, 0.47f));
            CreateOuterVillageBlock(root, "WestVillageBlock", new Vector3(-15.1f, 0f, -1.4f), new Color(0.37f, 0.34f, 0.29f));
            CreateOuterVillageBlock(root, "NorthVillageBlock", new Vector3(-2.2f, 0f, 13.3f), new Color(0.4f, 0.36f, 0.29f));
            CreateOuterVillageBlock(root, "SouthVillageBlock", new Vector3(-5.2f, 0f, -13.4f), new Color(0.36f, 0.34f, 0.3f));
            CreateOuterVillageBlock(root, "EastRiverVillageBlock", new Vector3(15.4f, 0f, 4.9f), new Color(0.34f, 0.37f, 0.34f));
            CreateOuterVillageBlock(root, "FarNorthVillageBlock", new Vector3(8.6f, 0f, 13.8f), new Color(0.39f, 0.36f, 0.31f));
            CreateOuterVillageBlock(root, "SouthEastVillageBlock", new Vector3(8.8f, 0f, -12.7f), new Color(0.35f, 0.36f, 0.31f));
            CreateWaterTower(root, "SouthWaterTower", new Vector3(6.8f, 0f, -13.2f), new Color(0.36f, 0.39f, 0.37f));
            CreateArchiveSignalTower(root, "ArchiveSignalTower", new Vector3(7.45f, 0f, 6.25f), new Color(0.34f, 0.36f, 0.36f));
            CreateWindmill(root, "NorthFieldWindmill", new Vector3(-9.4f, 0f, 12.6f), new Color(0.45f, 0.42f, 0.34f));
            CreateWindmill(root, "SouthFieldWindmill", new Vector3(0.8f, 0f, -14.15f), new Color(0.43f, 0.4f, 0.33f));
            CreateWindmill(root, "EastFieldWindmill", new Vector3(14.9f, 0f, -8.7f), new Color(0.43f, 0.41f, 0.34f));
            CreateTreeGrove(root, "NorthWestRealTreeLine", new Vector3(-13.6f, 0f, 10.8f), 9, new Vector3(1.15f, 0f, -0.18f));
            CreateTreeGrove(root, "NorthEastRealTreeLine", new Vector3(2.6f, 0f, 11.2f), 8, new Vector3(1.18f, 0f, 0.04f));
            CreateTreeGrove(root, "WestRealTreeLine", new Vector3(-14.0f, 0f, -8.6f), 12, new Vector3(0.05f, 0f, 1.45f));
            CreateTreeGrove(root, "SouthRealTreeLine", new Vector3(-12.5f, 0f, -12.2f), 11, new Vector3(1.4f, 0f, 0.08f));
            CreateTreeGrove(root, "RiverRealTreeLine", new Vector3(9.4f, 0f, -10.2f), 12, new Vector3(-0.05f, 0f, 1.55f));
            CreateTreeGrove(root, "NorthShelterbeltTreeLine", new Vector3(-17.5f, 0f, 16.4f), 20, new Vector3(1.75f, 0f, 0.03f));
            CreateTreeGrove(root, "WestShelterbeltTreeLine", new Vector3(-19.1f, 0f, -9.7f), 17, new Vector3(0.04f, 0f, 1.6f));

            CreateTilePatch(root, "SouthFieldFillTile", new Vector3(-6.4f, 0.006f, -7.9f), 9, 6, 0.86f, new Color(0.34f, 0.38f, 0.29f));
            CreateTilePatch(root, "NorthFieldFillTile", new Vector3(4.5f, 0.006f, 7.8f), 8, 6, 0.86f, new Color(0.32f, 0.38f, 0.29f));
            CreateTilePatch(root, "FarNorthVillageMeadow", new Vector3(9.0f, 0.006f, 10.6f), 8, 5, 0.88f, new Color(0.33f, 0.38f, 0.29f));
            CreateTilePatch(root, "SouthEastVillageMeadow", new Vector3(8.1f, 0.006f, -9.6f), 8, 5, 0.88f, new Color(0.32f, 0.37f, 0.29f));
            CreateFieldRows(root, "SouthOuterFieldRowsA", new Vector3(-9.5f, 0f, -8.8f), 8, new Color(0.36f, 0.39f, 0.25f));
            CreateFieldRows(root, "SouthOuterFieldRowsB", new Vector3(-7.8f, 0f, -8.65f), 8, new Color(0.37f, 0.37f, 0.24f));
            CreateFieldRows(root, "NorthOuterFieldRowsA", new Vector3(3.0f, 0f, 6.7f), 9, new Color(0.36f, 0.4f, 0.26f));
            CreateFieldRows(root, "NorthOuterFieldRowsB", new Vector3(4.6f, 0f, 6.85f), 9, new Color(0.38f, 0.39f, 0.25f));
            CreateFieldRows(root, "EastOuterFieldRowsA", new Vector3(12.5f, 0f, -7.8f), 8, new Color(0.35f, 0.39f, 0.27f));

            CreateGrassBorder(root, "OuterGrassWestA", new Vector3(-13.3f, 0f, -6.2f), 18, new Vector3(0.0f, 0f, 0.72f), new Color(0.26f, 0.36f, 0.23f));
            CreateGrassBorder(root, "OuterGrassNorthA", new Vector3(-11.6f, 0f, 10.1f), 22, new Vector3(0.82f, 0f, -0.02f), new Color(0.27f, 0.37f, 0.24f));
            CreateGrassBorder(root, "OuterGrassSouthA", new Vector3(-11.9f, 0f, -11.1f), 20, new Vector3(0.82f, 0f, 0.03f), new Color(0.27f, 0.35f, 0.23f));
            CreateGrassBorder(root, "RiverGrassFillA", new Vector3(8.6f, 0f, -10.2f), 22, new Vector3(0.02f, 0f, 0.72f), new Color(0.25f, 0.36f, 0.25f));
            CreateRoadShoulder(root, "FarNorthVillageConnector", new Vector3(4.6f, 0f, 13.0f), new Vector3(8.4f, 0.04f, 0.3f), new Color(0.29f, 0.28f, 0.24f));
            CreateRoadShoulder(root, "SouthEastVillageConnector", new Vector3(6.8f, 0f, -12.6f), new Vector3(6.5f, 0.04f, 0.3f), new Color(0.29f, 0.28f, 0.24f));
        }

        private static void CreateOuterVillageBlock(Transform root, string label, Vector3 origin, Color wallColor)
        {
            var seed = Mathf.Abs(label.GetHashCode());
            var lateral = ((seed % 7) - 3) * 0.18f;
            var depth = (((seed / 7) % 7) - 3) * 0.16f;
            CreateTilePatch(root, label + "_Ground", origin + new Vector3(lateral, -0.035f, depth), 9, 8, 0.9f, new Color(0.36f, 0.35f, 0.3f));
            CreateRoadShoulder(root, label + "_BentLaneA", origin + new Vector3(-1.2f, 0f, -0.55f), new Vector3(5.8f, 0.04f, 0.34f), new Color(0.28f, 0.28f, 0.25f));
            CreateRoadShoulder(root, label + "_BentLaneB", origin + new Vector3(1.35f, 0f, 0.42f), new Vector3(3.6f, 0.04f, 0.28f), new Color(0.3f, 0.29f, 0.25f));
            CreateRoadShoulder(root, label + "_FootCut", origin + new Vector3(-0.8f, 0f, 0.95f), new Vector3(0.28f, 0.04f, 3.9f), new Color(0.29f, 0.28f, 0.24f));

            CreateVillageBuilding(root, label + "_HomeA", origin + new Vector3(-2.75f + lateral, 0f, 1.95f), new Vector3(1.85f, 1.12f, 1.32f), wallColor, new Color(0.25f, 0.25f, 0.23f), false);
            CreateVillageBuilding(root, label + "_HomeB", origin + new Vector3(2.0f, 0f, 1.28f + depth), new Vector3(2.1f, 1.18f, 1.42f), wallColor * 0.95f, new Color(0.24f, 0.26f, 0.24f), false);
            CreateVillageBuilding(root, label + "_ShedA", origin + new Vector3(-2.05f, 0f, -2.28f), new Vector3(1.65f, 1.02f, 1.18f), wallColor * 0.88f, new Color(0.23f, 0.23f, 0.21f), false);
            CreateVillageBuilding(root, label + "_StoreA", origin + new Vector3(2.85f + lateral * 0.5f, 0f, -1.95f + depth), new Vector3(2.2f, 1.2f, 1.48f), wallColor * 1.04f, new Color(0.26f, 0.24f, 0.21f), false);

            CreateFenceLine(root, label + "_BrokenFenceNorthA", origin + new Vector3(-3.7f, 0f, 3.08f), origin + new Vector3(-0.6f, 0f, 3.0f), new Color(0.36f, 0.31f, 0.23f));
            CreateFenceLine(root, label + "_BrokenFenceNorthB", origin + new Vector3(0.7f, 0f, 2.92f), origin + new Vector3(3.55f, 0f, 3.12f), new Color(0.36f, 0.31f, 0.23f));
            CreateFenceLine(root, label + "_SideFence", origin + new Vector3(-3.65f, 0f, -2.7f), origin + new Vector3(-3.35f, 0f, 2.2f), new Color(0.34f, 0.3f, 0.23f));
            CreateCrateStack(root, label + "_CratesA", origin + new Vector3(-0.95f, 0f, -1.55f), new Color(0.34f, 0.3f, 0.24f));
            CreateBarrelCluster(root, label + "_BarrelsA", origin + new Vector3(0.95f, 0f, 1.15f), new Color(0.27f, 0.31f, 0.31f));
            CreateGroundDebris(root, label + "_DoorScrapA", origin + new Vector3(-1.15f, 0f, 0.4f), new Color(0.28f, 0.25f, 0.2f));
            CreateStakeBundle(root, label + "_RepairStakes", origin + new Vector3(1.45f, 0f, -0.9f), new Color(0.36f, 0.29f, 0.2f));
            CreateGrassBorder(root, label + "_GrassWest", origin + new Vector3(-3.85f, 0f, -2.65f), 7, new Vector3(0.08f, 0f, 0.76f), new Color(0.27f, 0.36f, 0.23f));
            CreateGrassBorder(root, label + "_GrassEast", origin + new Vector3(3.85f, 0f, -2.45f), 7, new Vector3(-0.06f, 0f, 0.72f), new Color(0.27f, 0.36f, 0.24f));
        }

        private static void CreateDistantMountainRange(Transform root, string label, Vector3 startPosition, int count, Vector3 step)
        {
            for (var index = 0; index < count; index++)
            {
                var position = startPosition + step * index;
                var height = 1.8f + (index % 4) * 0.48f;
                var width = 2.4f + (index % 3) * 0.55f;
                CreateMountainPeak(root, label + "_Peak_" + index, position, width, height, new Color(0.24f, 0.3f, 0.28f) * (0.9f + index % 2 * 0.08f));
            }
        }

        private static void CreateMountainPeak(Transform root, string label, Vector3 basePosition, float width, float height, Color color)
        {
            var body = CreateVisualPiece(root, PrimitiveType.Cube, label + "_Body", basePosition + new Vector3(0f, height * 0.46f, 0f), new Vector3(width, height, width * 0.42f), color);
            body.transform.localRotation = Quaternion.Euler(0f, 0f, 45f);
            var shoulder = CreateVisualPiece(root, PrimitiveType.Cube, label + "_Shoulder", basePosition + new Vector3(width * 0.22f, height * 0.28f, 0.1f), new Vector3(width * 0.72f, height * 0.58f, width * 0.36f), color * 0.82f);
            shoulder.transform.localRotation = Quaternion.Euler(0f, 0f, 34f);
            var snow = CreateVisualPiece(root, PrimitiveType.Cube, label + "_PaleRidge", basePosition + new Vector3(0.02f, height * 0.94f, -0.02f), new Vector3(width * 0.34f, height * 0.16f, width * 0.18f), new Color(0.58f, 0.64f, 0.58f));
            snow.transform.localRotation = Quaternion.Euler(0f, 0f, 45f);
        }

        private static void CreateWaterTower(Transform root, string label, Vector3 basePosition, Color color)
        {
            CreateCollisionBlocker(root, label + "_Collision", basePosition + new Vector3(0f, 1.1f, 0f), new Vector3(0.9f, 2.2f, 0.9f));
        }

        private static void CreateArchiveSignalTower(Transform root, string label, Vector3 basePosition, Color color)
        {
            CreateVisualPiece(root, PrimitiveType.Cylinder, label + "_Mast", basePosition + new Vector3(0f, 1.85f, 0f), new Vector3(0.055f, 1.85f, 0.055f), color);
            CreateVisualPiece(root, PrimitiveType.Cube, label + "_CrossA", basePosition + new Vector3(0f, 2.45f, 0f), new Vector3(1.1f, 0.045f, 0.045f), color * 0.9f);
            CreateVisualPiece(root, PrimitiveType.Cube, label + "_CrossB", basePosition + new Vector3(0f, 2.9f, 0f), new Vector3(0.82f, 0.04f, 0.04f), color * 0.88f);
            CreateVisualPiece(root, PrimitiveType.Sphere, label + "_Beacon", basePosition + new Vector3(0f, 3.82f, 0f), new Vector3(0.16f, 0.16f, 0.16f), new Color(0.76f, 0.68f, 0.36f));
            CreateCollisionBlocker(root, label + "_Collision", basePosition + new Vector3(0f, 1.2f, 0f), new Vector3(0.42f, 2.4f, 0.42f));
        }

        private static void CreateRealTree(Transform root, string label, Vector3 basePosition, float scale)
        {
            var seed = Mathf.Abs(label.GetHashCode());
            var lean = ((seed % 11) - 5) * 0.45f;
            var trunkColor = new Color(0.31f, 0.22f, 0.14f);
            var barkDark = new Color(0.22f, 0.16f, 0.1f);
            var trunk = CreateVisualPiece(root, PrimitiveType.Cylinder, label + "_Trunk", basePosition + new Vector3(0f, 0.74f * scale, 0f), new Vector3(0.13f * scale, 0.74f * scale, 0.13f * scale), trunkColor);
            trunk.transform.localRotation = Quaternion.Euler(lean, (seed % 37) - 18f, -lean * 0.7f);
            CreateVisualPiece(root, PrimitiveType.Cylinder, label + "_RootA", basePosition + new Vector3(-0.16f * scale, 0.08f, 0.04f), new Vector3(0.035f * scale, 0.22f * scale, 0.035f * scale), barkDark).transform.localRotation = Quaternion.Euler(0f, 18f, 76f);
            CreateVisualPiece(root, PrimitiveType.Cylinder, label + "_RootB", basePosition + new Vector3(0.16f * scale, 0.08f, -0.03f), new Vector3(0.032f * scale, 0.2f * scale, 0.032f * scale), barkDark).transform.localRotation = Quaternion.Euler(0f, -22f, -70f);
            CreateVisualPiece(root, PrimitiveType.Cylinder, label + "_RootC", basePosition + new Vector3(0.02f, 0.07f, 0.17f * scale), new Vector3(0.028f * scale, 0.16f * scale, 0.028f * scale), barkDark * 0.95f).transform.localRotation = Quaternion.Euler(74f, 0f, 5f);
            CreateVisualPiece(root, PrimitiveType.Cylinder, label + "_BranchA", basePosition + new Vector3(-0.26f * scale, 1.32f * scale, 0.04f), new Vector3(0.04f * scale, 0.38f * scale, 0.04f * scale), trunkColor * 0.88f).transform.localRotation = Quaternion.Euler(2f, -24f, 58f);
            CreateVisualPiece(root, PrimitiveType.Cylinder, label + "_BranchB", basePosition + new Vector3(0.27f * scale, 1.22f * scale, -0.05f), new Vector3(0.04f * scale, 0.34f * scale, 0.04f * scale), trunkColor * 0.86f).transform.localRotation = Quaternion.Euler(-2f, 32f, -54f);
            CreateVisualPiece(root, PrimitiveType.Cylinder, label + "_BranchC", basePosition + new Vector3(0.02f, 1.54f * scale, -0.28f * scale), new Vector3(0.033f * scale, 0.32f * scale, 0.033f * scale), trunkColor * 0.82f).transform.localRotation = Quaternion.Euler(56f, 4f, 0f);

            var leafBase = new Color(0.2f, 0.34f, 0.18f);
            CreateLeafCluster(root, label + "_FrontLeaves", basePosition + new Vector3(0f, 1.68f * scale, 0.08f * scale), scale, leafBase, 0f);
            CreateLeafCluster(root, label + "_LeftLeaves", basePosition + new Vector3(-0.38f * scale, 1.52f * scale, 0.02f), scale * 0.86f, leafBase * 0.92f, -28f);
            CreateLeafCluster(root, label + "_RightLeaves", basePosition + new Vector3(0.4f * scale, 1.5f * scale, -0.04f), scale * 0.84f, leafBase * 1.05f, 31f);
            CreateLeafCluster(root, label + "_TopLeaves", basePosition + new Vector3(0.05f * scale, 1.98f * scale, -0.02f), scale * 0.75f, leafBase * 1.12f, 12f);
            CreateLeafCluster(root, label + "_BackLeaves", basePosition + new Vector3(0.08f * scale, 1.58f * scale, -0.35f * scale), scale * 0.74f, leafBase * 0.84f, 48f);
            CreateCollisionBlocker(root, label + "_Collision", basePosition + new Vector3(0f, 0.55f * scale, 0f), new Vector3(0.42f * scale, 1.1f * scale, 0.42f * scale));
        }

        private static void CreateLeafCluster(Transform root, string label, Vector3 center, float scale, Color color, float yawOffset)
        {
            CreateLeafCard(root, label + "_LeafA", center + new Vector3(-0.08f * scale, 0.08f * scale, 0f), new Vector3(0.52f, 0.035f, 0.22f) * scale, color, yawOffset + 8f, 0f, 14f);
            CreateLeafCard(root, label + "_LeafB", center + new Vector3(0.12f * scale, -0.02f * scale, 0.04f * scale), new Vector3(0.46f, 0.032f, 0.2f) * scale, color * 0.92f, yawOffset - 18f, 0f, -18f);
            CreateLeafCard(root, label + "_LeafC", center + new Vector3(0.02f, 0.18f * scale, -0.06f * scale), new Vector3(0.42f, 0.03f, 0.18f) * scale, color * 1.08f, yawOffset + 34f, 4f, 28f);
            CreateLeafCard(root, label + "_LeafD", center + new Vector3(-0.2f * scale, -0.1f * scale, 0.02f), new Vector3(0.36f, 0.028f, 0.16f) * scale, color * 0.82f, yawOffset - 42f, -2f, 36f);
            CreateLeafCard(root, label + "_LeafE", center + new Vector3(0.23f * scale, 0.09f * scale, -0.05f * scale), new Vector3(0.34f, 0.026f, 0.15f) * scale, color * 1.02f, yawOffset + 62f, 2f, -32f);
            CreateLeafCard(root, label + "_LeafF", center + new Vector3(-0.02f, -0.18f * scale, 0.05f * scale), new Vector3(0.44f, 0.03f, 0.17f) * scale, color * 0.88f, yawOffset - 4f, -4f, 6f);
        }

        private static void CreateLeafCard(Transform root, string label, Vector3 position, Vector3 scale, Color color, float yaw, float pitch, float roll)
        {
            var leaf = CreateVisualPiece(root, PrimitiveType.Cube, label, position, scale, color);
            leaf.transform.localRotation = Quaternion.Euler(pitch, yaw, roll);
        }

        private static void CreateUtilityLine(Transform root, string label, Vector3 from, Vector3 to)
        {
            CreateVisualPiece(root, PrimitiveType.Cylinder, label + "_PoleA", from + new Vector3(0f, 1.25f, 0f), new Vector3(0.055f, 1.25f, 0.055f), new Color(0.31f, 0.25f, 0.18f));
            CreateVisualPiece(root, PrimitiveType.Cylinder, label + "_PoleB", to + new Vector3(0f, 1.25f, 0f), new Vector3(0.055f, 1.25f, 0.055f), new Color(0.31f, 0.25f, 0.18f));
            var mid = (from + to) * 0.5f + new Vector3(0f, 2.35f, 0f);
            var span = Vector3.Distance(from, to);
            var horizontal = Mathf.Abs(to.x - from.x) > Mathf.Abs(to.z - from.z);
            CreateVisualPiece(root, PrimitiveType.Capsule, label + "_WireA", mid, horizontal ? new Vector3(span * 0.26f, 0.01f, 0.01f) : new Vector3(0.01f, 0.01f, span * 0.26f), new Color(0.08f, 0.08f, 0.075f));
            CreateVisualPiece(root, PrimitiveType.Capsule, label + "_WireB", mid + new Vector3(0f, -0.08f, 0.08f), horizontal ? new Vector3(span * 0.26f, 0.01f, 0.01f) : new Vector3(0.01f, 0.01f, span * 0.26f), new Color(0.1f, 0.095f, 0.085f));
        }

        private static void CreatePorchDetails(Transform root, string label, Vector3 basePosition, Color color)
        {
            CreateVisualPiece(root, PrimitiveType.Cube, label + "_Deck", basePosition + new Vector3(0f, 0.13f, 0f), new Vector3(1.25f, 0.1f, 0.42f), color);
            CreateVisualPiece(root, PrimitiveType.Cylinder, label + "_PostL", basePosition + new Vector3(-0.52f, 0.62f, -0.12f), new Vector3(0.04f, 0.62f, 0.04f), color * 0.92f);
            CreateVisualPiece(root, PrimitiveType.Cylinder, label + "_PostR", basePosition + new Vector3(0.52f, 0.62f, -0.12f), new Vector3(0.04f, 0.62f, 0.04f), color * 0.92f);
            CreateVisualPiece(root, PrimitiveType.Cube, label + "_Awning", basePosition + new Vector3(0f, 1.16f, -0.06f), new Vector3(1.35f, 0.08f, 0.55f), color * 0.78f);
        }

        private static void CreateBarrelCluster(Transform root, string label, Vector3 basePosition, Color color)
        {
            CreateVisualPiece(root, PrimitiveType.Cylinder, label + "_A", basePosition + new Vector3(0f, 0.24f, 0f), new Vector3(0.14f, 0.24f, 0.14f), color);
            CreateVisualPiece(root, PrimitiveType.Cylinder, label + "_B", basePosition + new Vector3(0.22f, 0.2f, 0.1f), new Vector3(0.12f, 0.2f, 0.12f), color * 0.9f);
            CreateVisualPiece(root, PrimitiveType.Cylinder, label + "_C", basePosition + new Vector3(-0.18f, 0.18f, -0.08f), new Vector3(0.1f, 0.18f, 0.1f), color * 1.08f);
        }

        private static void CreateLaundryLine(Transform root, string label, Vector3 from, Vector3 to)
        {
            CreateVisualPiece(root, PrimitiveType.Cylinder, label + "_PoleA", from + new Vector3(0f, 0.82f, 0f), new Vector3(0.04f, 0.82f, 0.04f), new Color(0.32f, 0.27f, 0.2f));
            CreateVisualPiece(root, PrimitiveType.Cylinder, label + "_PoleB", to + new Vector3(0f, 0.82f, 0f), new Vector3(0.04f, 0.82f, 0.04f), new Color(0.32f, 0.27f, 0.2f));
            var mid = (from + to) * 0.5f + new Vector3(0f, 1.35f, 0f);
            CreateVisualPiece(root, PrimitiveType.Capsule, label + "_Line", mid, new Vector3(Vector3.Distance(from, to) * 0.27f, 0.012f, 0.012f), new Color(0.12f, 0.11f, 0.1f));
            CreateVisualPiece(root, PrimitiveType.Cube, label + "_ClothA", mid + new Vector3(-0.3f, -0.16f, 0.03f), new Vector3(0.24f, 0.2f, 0.035f), new Color(0.62f, 0.63f, 0.58f));
            CreateVisualPiece(root, PrimitiveType.Cube, label + "_ClothB", mid + new Vector3(0.15f, -0.14f, -0.02f), new Vector3(0.2f, 0.18f, 0.035f), new Color(0.42f, 0.5f, 0.52f));
        }

        private static void CreateCollisionBlocker(Transform root, string label, Vector3 localPosition, Vector3 localScale)
        {
            var blocker = new GameObject(label);
            blocker.transform.SetParent(root, false);
            blocker.transform.localPosition = localPosition;
            blocker.transform.localScale = localScale;
            var box = blocker.AddComponent<BoxCollider>();
            box.size = Vector3.one;
        }

        private static void CreateLandmarkVisual(
            Transform root,
            WorldPrototype3DLandmark landmark,
            Material fieldMaterial,
            Material archiveMaterial,
            Material placementMaterial,
            Material roadMaterial,
            Material storageMaterial)
        {
            switch (landmark.kind)
            {
                case "field":
                    CreateFieldPatch(root, landmark, PickMaterial(fieldMaterial, landmark.accent, new Color(0.46f, 0.45f, 0.33f)));
                    break;
                case "road":
                    CreateRoadPatch(root, landmark, PickMaterial(roadMaterial, landmark.accent, new Color(0.32f, 0.34f, 0.36f)));
                    break;
                case "archive":
                    CreateArchiveOutpost(root, landmark, PickMaterial(archiveMaterial, landmark.accent, new Color(0.36f, 0.41f, 0.45f)));
                    break;
                case "storage":
                    CreateStorageNode(root, landmark, PickMaterial(storageMaterial, landmark.accent, new Color(0.42f, 0.36f, 0.28f)));
                    break;
                case "placement-zone":
                    CreatePlacementRing(root, landmark, PickMaterial(placementMaterial, landmark.accent, new Color(0.56f, 0.5f, 0.3f)));
                    break;
                case "plot-row":
                    CreatePlotRowPatch(root, landmark, PickMaterial(fieldMaterial, landmark.accent, new Color(0.47f, 0.36f, 0.22f)));
                    break;
                case "fence":
                    CreateFence(root, landmark, PickMaterial(storageMaterial, landmark.accent, new Color(0.48f, 0.4f, 0.3f)));
                    break;
                case "canopy":
                    CreateCanopy(root, landmark, PickMaterial(archiveMaterial, landmark.accent, new Color(0.48f, 0.46f, 0.4f)));
                    break;
                case "signal-post":
                    CreateSignalPost(root, landmark, PickMaterial(placementMaterial, landmark.accent, new Color(0.78f, 0.68f, 0.38f)));
                    break;
                case "crate-cluster":
                    CreateCrateCluster(root, landmark, PickMaterial(storageMaterial, landmark.accent, new Color(0.54f, 0.44f, 0.3f)));
                    break;
                case "route-strip":
                    CreateRouteStrip(root, landmark, PickMaterial(placementMaterial, landmark.accent, new Color(0.58f, 0.52f, 0.34f)));
                    break;
                default:
                    CreateVisualPiece(root, PrimitiveType.Cube, landmark.label, new Vector3(landmark.x, landmark.height * 0.5f, landmark.z), new Vector3(landmark.width, landmark.height, landmark.depth), PickMaterial(fieldMaterial, landmark.accent, new Color(0.58f, 0.58f, 0.58f)));
                    break;
            }
        }

        private static void CreateFieldPatch(Transform root, WorldPrototype3DLandmark landmark, Material material)
        {
            CreateVisualPiece(root, PrimitiveType.Cylinder, landmark.label + "_Base", new Vector3(landmark.x, landmark.height * 0.35f, landmark.z), new Vector3(landmark.width * 0.52f, landmark.height * 0.35f, landmark.depth * 0.52f), material);
            CreateVisualPiece(root, PrimitiveType.Cylinder, landmark.label + "_Crown", new Vector3(landmark.x, landmark.height * 0.45f, landmark.z), new Vector3(landmark.width * 0.42f, landmark.height * 0.18f, landmark.depth * 0.42f), MultiplyColor(material, 1.06f));
            CreateVisualPiece(root, PrimitiveType.Capsule, landmark.label + "_EdgeNorth", new Vector3(landmark.x, landmark.height * 0.38f, landmark.z + landmark.depth * 0.42f), new Vector3(landmark.width * 0.24f, landmark.height * 0.1f, 0.08f), MultiplyColor(material, 0.92f));
            CreateVisualPiece(root, PrimitiveType.Capsule, landmark.label + "_EdgeSouth", new Vector3(landmark.x, landmark.height * 0.38f, landmark.z - landmark.depth * 0.42f), new Vector3(landmark.width * 0.24f, landmark.height * 0.1f, 0.08f), MultiplyColor(material, 0.92f));
        }

        private static void CreateRoadPatch(Transform root, WorldPrototype3DLandmark landmark, Material material)
        {
            CreateVisualPiece(root, PrimitiveType.Cube, landmark.label + "_Strip", new Vector3(landmark.x, 0.025f, landmark.z), new Vector3(landmark.width, 0.05f, landmark.depth), material);
            CreateVisualPiece(root, PrimitiveType.Capsule, landmark.label + "_ShoulderA", new Vector3(landmark.x, 0.03f, landmark.z - landmark.depth * 0.44f), new Vector3(landmark.width * 0.24f, 0.01f, 0.08f), MultiplyColor(material, 0.88f));
            CreateVisualPiece(root, PrimitiveType.Capsule, landmark.label + "_ShoulderB", new Vector3(landmark.x, 0.03f, landmark.z + landmark.depth * 0.44f), new Vector3(landmark.width * 0.24f, 0.01f, 0.08f), MultiplyColor(material, 0.88f));
        }

        private static void CreatePlotRowPatch(Transform root, WorldPrototype3DLandmark landmark, Material material)
        {
            CreateVisualPiece(root, PrimitiveType.Capsule, landmark.label + "_Ridge", new Vector3(landmark.x, landmark.height * 0.45f, landmark.z), new Vector3(landmark.width * 0.48f, landmark.height * 0.44f, landmark.depth * 0.34f), material);
            CreateVisualPiece(root, PrimitiveType.Capsule, landmark.label + "_FurrowA", new Vector3(landmark.x, landmark.height * 0.24f, landmark.z - landmark.depth * 0.3f), new Vector3(landmark.width * 0.42f, landmark.height * 0.12f, landmark.depth * 0.08f), MultiplyColor(material, 0.82f));
            CreateVisualPiece(root, PrimitiveType.Capsule, landmark.label + "_FurrowB", new Vector3(landmark.x, landmark.height * 0.24f, landmark.z + landmark.depth * 0.3f), new Vector3(landmark.width * 0.42f, landmark.height * 0.12f, landmark.depth * 0.08f), MultiplyColor(material, 0.82f));
        }

        private static void CreateRouteStrip(Transform root, WorldPrototype3DLandmark landmark, Material material)
        {
            CreateVisualPiece(root, PrimitiveType.Capsule, landmark.label + "_Path", new Vector3(landmark.x, landmark.height * 0.4f, landmark.z), new Vector3(landmark.width * 0.48f, landmark.height * 0.32f, landmark.depth * 0.48f), material);
            CreateVisualPiece(root, PrimitiveType.Sphere, landmark.label + "_CapA", new Vector3(landmark.x - landmark.width * 0.42f, landmark.height * 0.44f, landmark.z), new Vector3(0.12f, 0.12f, 0.12f), MultiplyColor(material, 1.08f));
            CreateVisualPiece(root, PrimitiveType.Sphere, landmark.label + "_CapB", new Vector3(landmark.x + landmark.width * 0.42f, landmark.height * 0.44f, landmark.z), new Vector3(0.12f, 0.12f, 0.12f), MultiplyColor(material, 1.08f));
        }

        private static void CreateFence(Transform root, WorldPrototype3DLandmark landmark, Material material)
        {
            var horizontal = landmark.width >= landmark.depth;
            var rail = CreateVisualPiece(
                root,
                PrimitiveType.Capsule,
                landmark.label,
                new Vector3(landmark.x, 0.52f, landmark.z),
                horizontal ? new Vector3(landmark.width * 0.5f, 0.05f, 0.05f) : new Vector3(0.05f, 0.05f, landmark.depth * 0.5f),
                material);
            rail.transform.localScale = horizontal
                ? new Vector3(landmark.width * 0.5f, 0.05f, 0.05f)
                : new Vector3(0.05f, 0.05f, landmark.depth * 0.5f);

            var isVertical = landmark.depth > landmark.width;
            var span = isVertical ? landmark.depth : landmark.width;
            var postCount = Mathf.Max(2, Mathf.RoundToInt(span / 1.4f));
            for (var index = 0; index < postCount; index++)
            {
                var t = postCount == 1 ? 0.5f : index / (float)(postCount - 1);
                var x = isVertical ? landmark.x : Mathf.Lerp(landmark.x - landmark.width * 0.5f, landmark.x + landmark.width * 0.5f, t);
                var z = isVertical ? Mathf.Lerp(landmark.z - landmark.depth * 0.5f, landmark.z + landmark.depth * 0.5f, t) : landmark.z;
                CreateVisualPiece(root, PrimitiveType.Cylinder, landmark.label + "_Post_" + index, new Vector3(x, 0.52f, z), new Vector3(0.08f, 0.5f, 0.08f), material);
            }
        }

        private static void CreateSignProp(Transform root)
        {
            // Meshy notice-board dressing owns the visual; keep the interaction root clean.
        }

        private static void CreateSupplyProp(Transform root)
        {
            // Curated Meshy supply props replace primitive crates.
        }

        private static void CreateObserverProp(Transform root)
        {
            // Keep the interaction point but remove capsule placeholder clutter.
        }

        private static void CreateBeaconPreview(Transform root)
        {
            // Preserve placement logic on the root; remove the tall gray primitive preview.
        }

        private static void CreateRelayPreview(Transform root)
        {
            // Keep relay anchors clean until a curated model is approved.
        }

        private static void CreateArchiveOutpost(Transform root, WorldPrototype3DLandmark landmark, Material material)
        {
            CreateVisualPiece(root, PrimitiveType.Cylinder, landmark.label + "_Floor", new Vector3(landmark.x, 0.08f, landmark.z), new Vector3((landmark.width + 0.3f) * 0.48f, 0.08f, (landmark.depth + 0.2f) * 0.48f), MultiplyColor(material, 0.88f));
            CreateVisualPiece(root, PrimitiveType.Capsule, landmark.label + "_RearWall", new Vector3(landmark.x, 1.05f, landmark.z - landmark.depth * 0.34f), new Vector3(landmark.width * 0.48f, 0.88f, 0.09f), material);
            CreateVisualPiece(root, PrimitiveType.Cylinder, landmark.label + "_Desk", new Vector3(landmark.x - 0.6f, 0.42f, landmark.z + 0.5f), new Vector3(0.62f, 0.32f, 0.24f), MultiplyColor(material, 1.08f));
            CreateVisualPiece(root, PrimitiveType.Capsule, landmark.label + "_Shelf", new Vector3(landmark.x + 0.95f, 0.82f, landmark.z + 0.25f), new Vector3(0.22f, 0.58f, 0.16f), MultiplyColor(material, 0.94f));
            CreateVisualPiece(root, PrimitiveType.Capsule, landmark.label + "_Ledger", new Vector3(landmark.x - 0.35f, 0.94f, landmark.z + 0.52f), new Vector3(0.14f, 0.02f, 0.09f), new Color(0.84f, 0.78f, 0.62f));
            CreateVisualPiece(root, PrimitiveType.Capsule, landmark.label + "_PinBoard", new Vector3(landmark.x + 1.05f, 1.42f, landmark.z - 0.2f), new Vector3(0.16f, 0.19f, 0.02f), new Color(0.46f, 0.4f, 0.26f));
            CreateVisualPiece(root, PrimitiveType.Capsule, landmark.label + "_PaperA", new Vector3(landmark.x + 0.98f, 1.48f, landmark.z - 0.17f), new Vector3(0.05f, 0.06f, 0.01f), new Color(0.78f, 0.74f, 0.66f));
            CreateVisualPiece(root, PrimitiveType.Capsule, landmark.label + "_DeskRoll", new Vector3(landmark.x - 0.9f, 0.42f, landmark.z + 0.7f), new Vector3(0.18f, 0.12f, 0.18f), new Color(0.48f, 0.41f, 0.29f));
            CreateVisualPiece(root, PrimitiveType.Cylinder, landmark.label + "_CanopyPoleA", new Vector3(landmark.x - 1.35f, 0.95f, landmark.z + 1.12f), new Vector3(0.06f, 0.95f, 0.06f), MultiplyColor(material, 0.86f));
            CreateVisualPiece(root, PrimitiveType.Cylinder, landmark.label + "_CanopyPoleB", new Vector3(landmark.x + 1.35f, 0.95f, landmark.z + 1.12f), new Vector3(0.06f, 0.95f, 0.06f), MultiplyColor(material, 0.86f));
            CreateVisualPiece(root, PrimitiveType.Capsule, landmark.label + "_Canopy", new Vector3(landmark.x, 1.86f, landmark.z + 0.54f), new Vector3(1.46f, 0.08f, 0.92f), new Color(0.46f, 0.46f, 0.4f));
            CreateVisualPiece(root, PrimitiveType.Capsule, landmark.label + "_Chair", new Vector3(landmark.x - 0.98f, 0.2f, landmark.z + 0.86f), new Vector3(0.13f, 0.17f, 0.13f), new Color(0.33f, 0.29f, 0.22f));
            CreateVisualPiece(root, PrimitiveType.Capsule, landmark.label + "_BoxStack", new Vector3(landmark.x + 1.28f, 0.38f, landmark.z + 0.86f), new Vector3(0.24f, 0.22f, 0.22f), new Color(0.42f, 0.36f, 0.28f));
            CreateVisualPiece(root, PrimitiveType.Capsule, landmark.label + "_FloorRoll", new Vector3(landmark.x + 1.0f, 0.12f, landmark.z + 0.95f), new Vector3(0.16f, 0.06f, 0.12f), new Color(0.29f, 0.31f, 0.34f));
        }

        private static void CreateStorageNode(Transform root, WorldPrototype3DLandmark landmark, Material material)
        {
            CreateVisualPiece(root, PrimitiveType.Cylinder, landmark.label + "_Pad", new Vector3(landmark.x, 0.08f, landmark.z), new Vector3((landmark.width + 0.2f) * 0.48f, 0.07f, (landmark.depth + 0.2f) * 0.48f), MultiplyColor(material, 0.84f));
            CreateVisualPiece(root, PrimitiveType.Capsule, landmark.label + "_ShelfA", new Vector3(landmark.x - 0.55f, 0.72f, landmark.z), new Vector3(0.09f, 0.52f, landmark.depth * 0.46f), MultiplyColor(material, 0.92f));
            CreateVisualPiece(root, PrimitiveType.Capsule, landmark.label + "_ShelfB", new Vector3(landmark.x + 0.55f, 0.72f, landmark.z), new Vector3(0.09f, 0.52f, landmark.depth * 0.46f), MultiplyColor(material, 0.92f));
            CreateVisualPiece(root, PrimitiveType.Capsule, landmark.label + "_TopRail", new Vector3(landmark.x, 1.18f, landmark.z), new Vector3(landmark.width * 0.48f, 0.04f, landmark.depth * 0.1f), MultiplyColor(material, 1.04f));
            CreateVisualPiece(root, PrimitiveType.Capsule, landmark.label + "_CrateA", new Vector3(landmark.x - 0.35f, 0.36f, landmark.z - 0.25f), new Vector3(0.28f, 0.22f, 0.28f), material);
            CreateVisualPiece(root, PrimitiveType.Capsule, landmark.label + "_CrateB", new Vector3(landmark.x + 0.3f, 0.64f, landmark.z + 0.18f), new Vector3(0.22f, 0.18f, 0.22f), MultiplyColor(material, 1.08f));
            CreateVisualPiece(root, PrimitiveType.Capsule, landmark.label + "_Tarp", new Vector3(landmark.x, 1.34f, landmark.z - 0.08f), new Vector3(landmark.width * 0.55f, 0.04f, landmark.depth * 0.42f), new Color(0.28f, 0.38f, 0.44f));
            CreateVisualPiece(root, PrimitiveType.Cube, landmark.label + "_Pallet", new Vector3(landmark.x - 0.1f, 0.13f, landmark.z + 0.52f), new Vector3(0.68f, 0.08f, 0.28f), new Color(0.34f, 0.28f, 0.2f));
            CreateVisualPiece(root, PrimitiveType.Cylinder, landmark.label + "_MarkerPole", new Vector3(landmark.x - 1.02f, 0.72f, landmark.z + 0.82f), new Vector3(0.06f, 0.72f, 0.06f), new Color(0.56f, 0.49f, 0.32f));
            CreateVisualPiece(root, PrimitiveType.Sphere, landmark.label + "_MarkerLamp", new Vector3(landmark.x - 1.02f, 1.48f, landmark.z + 0.82f), new Vector3(0.16f, 0.16f, 0.16f), new Color(0.8f, 0.72f, 0.42f));
            CreateVisualPiece(root, PrimitiveType.Capsule, landmark.label + "_Bag", new Vector3(landmark.x + 0.98f, 0.24f, landmark.z - 0.58f), new Vector3(0.22f, 0.14f, 0.16f), new Color(0.34f, 0.31f, 0.24f));
            CreateVisualPiece(root, PrimitiveType.Capsule, landmark.label + "_BagB", new Vector3(landmark.x + 0.72f, 0.2f, landmark.z - 0.28f), new Vector3(0.18f, 0.12f, 0.13f), new Color(0.32f, 0.29f, 0.23f));
            CreateVisualPiece(root, PrimitiveType.Capsule, landmark.label + "_ShelfRoll", new Vector3(landmark.x - 0.54f, 1.06f, landmark.z + 0.38f), new Vector3(0.1f, 0.06f, 0.08f), new Color(0.3f, 0.33f, 0.35f));
        }

        private static void CreateTreeMass(Transform root, string label, Vector3 basePosition, Vector3 canopyScale)
        {
            var averageScale = Mathf.Max(0.75f, (canopyScale.x + canopyScale.y + canopyScale.z) / 3f * 0.58f);
            CreateRealTree(root, label, basePosition, averageScale);
        }

        private static void CreateBackdropMass(Transform root, string label, Vector3 basePosition, Vector3 scale, Color color)
        {
            CreateVisualPiece(root, PrimitiveType.Capsule, label + "_Main", basePosition + new Vector3(0f, scale.y * 0.5f, 0f), new Vector3(scale.x * 0.48f, scale.y * 0.44f, scale.z * 0.38f), color);
            CreateVisualPiece(root, PrimitiveType.Capsule, label + "_Side", basePosition + new Vector3(scale.x * 0.18f, scale.y * 0.38f, scale.z * 0.14f), new Vector3(scale.x * 0.28f, scale.y * 0.28f, scale.z * 0.24f), color * 0.96f);
        }

        private static void CreateFenceLine(Transform root, string label, Vector3 from, Vector3 to, Color color)
        {
            var segments = 5;
            for (var index = 0; index <= segments; index++)
            {
                var t = index / (float)segments;
                var position = Vector3.Lerp(from, to, t);
                CreateVisualPiece(root, PrimitiveType.Cylinder, label + "_Post_" + index, position + new Vector3(0f, 0.45f, 0f), new Vector3(0.05f, 0.45f, 0.05f), color * 0.95f);
                if (index < segments)
                {
                    var next = Vector3.Lerp(from, to, (index + 1) / (float)segments);
                    var mid = (position + next) * 0.5f;
                    var span = Vector3.Distance(position, next);
                    var horizontal = Mathf.Abs(to.x - from.x) > Mathf.Abs(to.z - from.z);
                    CreateVisualPiece(root, PrimitiveType.Capsule, label + "_RailA_" + index, mid + new Vector3(0f, 0.62f, 0f), horizontal ? new Vector3(span * 0.26f, 0.03f, 0.03f) : new Vector3(0.03f, 0.03f, span * 0.26f), color);
                    CreateVisualPiece(root, PrimitiveType.Capsule, label + "_RailB_" + index, mid + new Vector3(0f, 0.38f, 0f), horizontal ? new Vector3(span * 0.26f, 0.03f, 0.03f) : new Vector3(0.03f, 0.03f, span * 0.26f), color * 0.94f);
                }
            }
        }

        private static void CreateSmallPropCluster(Transform root, string label, Vector3 basePosition, Color color)
        {
            CreateVisualPiece(root, PrimitiveType.Capsule, label + "_Bench", basePosition + new Vector3(0f, 0.24f, 0f), new Vector3(0.64f, 0.12f, 0.26f), color);
            CreateVisualPiece(root, PrimitiveType.Capsule, label + "_BoxA", basePosition + new Vector3(-0.46f, 0.18f, 0.3f), new Vector3(0.18f, 0.2f, 0.18f), color * 0.9f);
            CreateVisualPiece(root, PrimitiveType.Capsule, label + "_BoxB", basePosition + new Vector3(0.42f, 0.14f, -0.24f), new Vector3(0.16f, 0.18f, 0.16f), color * 1.06f);
            CreateVisualPiece(root, PrimitiveType.Cylinder, label + "_Lantern", basePosition + new Vector3(0.62f, 0.46f, 0.18f), new Vector3(0.07f, 0.24f, 0.07f), new Color(0.6f, 0.54f, 0.38f));
            CreateVisualPiece(root, PrimitiveType.Capsule, label + "_Plank", basePosition + new Vector3(-0.18f, 0.08f, -0.28f), new Vector3(0.28f, 0.03f, 0.06f), color * 0.82f);
        }

        private static void CreateLooseTarp(Transform root, string label, Vector3 basePosition, Color color)
        {
            CreateVisualPiece(root, PrimitiveType.Capsule, label + "_Main", basePosition + new Vector3(0f, 0.06f, 0f), new Vector3(0.55f, 0.03f, 0.36f), color);
            CreateVisualPiece(root, PrimitiveType.Capsule, label + "_Fold", basePosition + new Vector3(0.16f, 0.08f, -0.06f), new Vector3(0.2f, 0.03f, 0.12f), color * 1.06f);
        }

        private static void CreateFenceBreak(Transform root, string label, Vector3 basePosition, Color color)
        {
            CreateVisualPiece(root, PrimitiveType.Cylinder, label + "_PostA", basePosition + new Vector3(-0.22f, 0.32f, 0f), new Vector3(0.05f, 0.32f, 0.05f), color);
            CreateVisualPiece(root, PrimitiveType.Cylinder, label + "_PostB", basePosition + new Vector3(0.22f, 0.26f, 0f), new Vector3(0.05f, 0.26f, 0.05f), color);
            CreateVisualPiece(root, PrimitiveType.Capsule, label + "_Rail", basePosition + new Vector3(0f, 0.36f, 0f), new Vector3(0.22f, 0.025f, 0.03f), color * 0.92f);
        }

        private static void CreateStakeLine(Transform root, string label, Vector3 startPosition, int count, Vector3 step, Color color)
        {
            for (var index = 0; index < count; index++)
            {
                var position = startPosition + step * index;
                CreateVisualPiece(root, PrimitiveType.Cylinder, label + "_Stake_" + index, position + new Vector3(0f, 0.16f, 0f), new Vector3(0.03f, 0.16f, 0.03f), color);
                CreateVisualPiece(root, PrimitiveType.Capsule, label + "_Tie_" + index, position + new Vector3(0.05f, 0.22f, 0.03f), new Vector3(0.06f, 0.015f, 0.015f), color * 0.88f);
            }
        }

        private static void CreateCableSpool(Transform root, string label, Vector3 basePosition, Color color)
        {
            CreateVisualPiece(root, PrimitiveType.Cylinder, label + "_Roll", basePosition + new Vector3(0f, 0.16f, 0f), new Vector3(0.18f, 0.16f, 0.18f), color);
            CreateVisualPiece(root, PrimitiveType.Cylinder, label + "_CapA", basePosition + new Vector3(0f, 0.16f, -0.12f), new Vector3(0.22f, 0.01f, 0.22f), color * 0.9f);
            CreateVisualPiece(root, PrimitiveType.Cylinder, label + "_CapB", basePosition + new Vector3(0f, 0.16f, 0.12f), new Vector3(0.22f, 0.01f, 0.22f), color * 0.9f);
        }

        private static void CreateCrateStack(Transform root, string label, Vector3 basePosition, Color color)
        {
            CreateVisualPiece(root, PrimitiveType.Capsule, label + "_Base", basePosition + new Vector3(0f, 0.16f, 0f), new Vector3(0.24f, 0.16f, 0.2f), color);
            CreateVisualPiece(root, PrimitiveType.Capsule, label + "_Top", basePosition + new Vector3(0.14f, 0.42f, 0.02f), new Vector3(0.18f, 0.14f, 0.16f), color * 1.04f);
            CreateVisualPiece(root, PrimitiveType.Capsule, label + "_Tie", basePosition + new Vector3(-0.1f, 0.22f, 0.16f), new Vector3(0.02f, 0.12f, 0.02f), color * 0.84f);
        }

        private static void CreateMarkerFlag(Transform root, string label, Vector3 basePosition, Color color)
        {
            CreateVisualPiece(root, PrimitiveType.Cylinder, label + "_Pole", basePosition + new Vector3(0f, 0.36f, 0f), new Vector3(0.03f, 0.36f, 0.03f), color * 0.82f);
            CreateVisualPiece(root, PrimitiveType.Capsule, label + "_Cloth", basePosition + new Vector3(0.1f, 0.56f, 0f), new Vector3(0.14f, 0.05f, 0.02f), color);
        }

        private static void CreateToolScatter(Transform root, string label, Vector3 basePosition, Color color)
        {
            CreateVisualPiece(root, PrimitiveType.Capsule, label + "_HandleA", basePosition + new Vector3(0f, 0.06f, 0f), new Vector3(0.12f, 0.015f, 0.02f), color);
            CreateVisualPiece(root, PrimitiveType.Capsule, label + "_HeadA", basePosition + new Vector3(0.12f, 0.08f, 0f), new Vector3(0.04f, 0.025f, 0.025f), color * 1.08f);
            CreateVisualPiece(root, PrimitiveType.Capsule, label + "_HandleB", basePosition + new Vector3(-0.16f, 0.05f, 0.08f), new Vector3(0.1f, 0.015f, 0.02f), color * 0.92f);
        }

        private static void CreatePaperScatter(Transform root, string label, Vector3 basePosition, Color color)
        {
            CreateVisualPiece(root, PrimitiveType.Capsule, label + "_SheetA", basePosition + new Vector3(0f, 0.02f, 0f), new Vector3(0.12f, 0.004f, 0.08f), color);
            CreateVisualPiece(root, PrimitiveType.Capsule, label + "_SheetB", basePosition + new Vector3(0.1f, 0.025f, -0.05f), new Vector3(0.1f, 0.004f, 0.07f), color * 0.96f);
            CreateVisualPiece(root, PrimitiveType.Capsule, label + "_SheetC", basePosition + new Vector3(-0.08f, 0.018f, 0.06f), new Vector3(0.08f, 0.004f, 0.06f), color * 0.92f);
        }

        private static void CreateSupplyMarker(Transform root, string label, Vector3 basePosition, Color color)
        {
            CreateVisualPiece(root, PrimitiveType.Cylinder, label + "_Pole", basePosition + new Vector3(0f, 0.44f, 0f), new Vector3(0.04f, 0.44f, 0.04f), color * 0.84f);
            CreateVisualPiece(root, PrimitiveType.Capsule, label + "_Panel", basePosition + new Vector3(0.12f, 0.7f, 0f), new Vector3(0.16f, 0.05f, 0.02f), color);
        }

        private static void CreateArchiveShelf(Transform root, string label, Vector3 basePosition, Color color)
        {
            CreateVisualPiece(root, PrimitiveType.Cylinder, label + "_PostA", basePosition + new Vector3(-0.18f, 0.46f, 0f), new Vector3(0.04f, 0.46f, 0.04f), color);
            CreateVisualPiece(root, PrimitiveType.Cylinder, label + "_PostB", basePosition + new Vector3(0.18f, 0.46f, 0f), new Vector3(0.04f, 0.46f, 0.04f), color);
            CreateVisualPiece(root, PrimitiveType.Capsule, label + "_ShelfA", basePosition + new Vector3(0f, 0.38f, 0f), new Vector3(0.24f, 0.025f, 0.08f), color * 0.96f);
            CreateVisualPiece(root, PrimitiveType.Capsule, label + "_ShelfB", basePosition + new Vector3(0f, 0.68f, 0f), new Vector3(0.24f, 0.025f, 0.08f), color * 0.96f);
        }

        private static void CreateStackedPosts(Transform root, string label, Vector3 basePosition, Color color)
        {
            CreateVisualPiece(root, PrimitiveType.Cylinder, label + "_A", basePosition + new Vector3(0f, 0.2f, 0f), new Vector3(0.08f, 0.2f, 0.08f), color);
            CreateVisualPiece(root, PrimitiveType.Cylinder, label + "_B", basePosition + new Vector3(0.18f, 0.14f, 0.06f), new Vector3(0.06f, 0.14f, 0.06f), color * 0.94f);
            CreateVisualPiece(root, PrimitiveType.Cylinder, label + "_C", basePosition + new Vector3(-0.14f, 0.12f, -0.04f), new Vector3(0.05f, 0.12f, 0.05f), color * 0.88f);
        }

        private static void CreateGroundDebris(Transform root, string label, Vector3 basePosition, Color color)
        {
            CreateVisualPiece(root, PrimitiveType.Capsule, label + "_A", basePosition + new Vector3(0f, 0.015f, 0f), new Vector3(0.16f, 0.008f, 0.03f), color);
            CreateVisualPiece(root, PrimitiveType.Capsule, label + "_B", basePosition + new Vector3(0.12f, 0.018f, -0.06f), new Vector3(0.09f, 0.008f, 0.02f), color * 0.92f);
            CreateVisualPiece(root, PrimitiveType.Cylinder, label + "_Stone", basePosition + new Vector3(-0.1f, 0.02f, 0.05f), new Vector3(0.05f, 0.02f, 0.03f), color * 1.04f);
        }

        private static void CreateStakeBundle(Transform root, string label, Vector3 basePosition, Color color)
        {
            CreateVisualPiece(root, PrimitiveType.Cylinder, label + "_A", basePosition + new Vector3(-0.05f, 0.22f, 0f), new Vector3(0.025f, 0.22f, 0.025f), color);
            CreateVisualPiece(root, PrimitiveType.Cylinder, label + "_B", basePosition + new Vector3(0.02f, 0.2f, 0.04f), new Vector3(0.025f, 0.2f, 0.025f), color * 0.96f);
            CreateVisualPiece(root, PrimitiveType.Cylinder, label + "_C", basePosition + new Vector3(0.08f, 0.18f, -0.03f), new Vector3(0.025f, 0.18f, 0.025f), color * 0.92f);
        }

        private static void CreateCanCluster(Transform root, string label, Vector3 basePosition, Color color)
        {
            CreateVisualPiece(root, PrimitiveType.Cylinder, label + "_CanA", basePosition + new Vector3(0f, 0.08f, 0f), new Vector3(0.06f, 0.08f, 0.06f), color);
            CreateVisualPiece(root, PrimitiveType.Cylinder, label + "_CanB", basePosition + new Vector3(0.12f, 0.07f, -0.03f), new Vector3(0.055f, 0.07f, 0.055f), color * 0.94f);
            CreateVisualPiece(root, PrimitiveType.Cylinder, label + "_CanC", basePosition + new Vector3(-0.1f, 0.065f, 0.04f), new Vector3(0.05f, 0.065f, 0.05f), color * 1.02f);
        }

        private static void CreateClothLine(Transform root, string label, Vector3 from, Vector3 to, Color color)
        {
            CreateVisualPiece(root, PrimitiveType.Cylinder, label + "_PoleA", from + new Vector3(0f, 0.9f, 0f), new Vector3(0.04f, 0.9f, 0.04f), color * 0.82f);
            CreateVisualPiece(root, PrimitiveType.Cylinder, label + "_PoleB", to + new Vector3(0f, 0.86f, 0f), new Vector3(0.04f, 0.86f, 0.04f), color * 0.82f);
            var mid = (from + to) * 0.5f;
            var span = Vector3.Distance(from, to);
            CreateVisualPiece(root, PrimitiveType.Capsule, label + "_Line", mid + new Vector3(0f, 1.12f, 0f), new Vector3(span * 0.26f, 0.012f, 0.012f), color * 0.7f);
            CreateVisualPiece(root, PrimitiveType.Capsule, label + "_ClothA", mid + new Vector3(-0.18f, 1.0f, 0.02f), new Vector3(0.11f, 0.05f, 0.02f), color * 1.04f);
            CreateVisualPiece(root, PrimitiveType.Capsule, label + "_ClothB", mid + new Vector3(0.15f, 0.97f, -0.02f), new Vector3(0.09f, 0.045f, 0.02f), color * 0.96f);
        }

        private static void CreatePathPost(Transform root, string label, Vector3 basePosition, Color color)
        {
            CreateVisualPiece(root, PrimitiveType.Cylinder, label + "_Post", basePosition + new Vector3(0f, 0.32f, 0f), new Vector3(0.05f, 0.32f, 0.05f), color * 0.9f);
            CreateVisualPiece(root, PrimitiveType.Sphere, label + "_Cap", basePosition + new Vector3(0f, 0.68f, 0f), new Vector3(0.11f, 0.11f, 0.11f), color);
        }

        private static void CreatePlacementRing(Transform root, WorldPrototype3DLandmark landmark, Material material)
        {
            CreateVisualPiece(root, PrimitiveType.Cylinder, landmark.label + "_Base", new Vector3(landmark.x, 0.02f, landmark.z), new Vector3(landmark.width * 0.5f, 0.03f, landmark.depth * 0.5f), material);
            CreateVisualPiece(root, PrimitiveType.Cylinder, landmark.label + "_Core", new Vector3(landmark.x, 0.045f, landmark.z), new Vector3(landmark.width * 0.28f, 0.025f, landmark.depth * 0.28f), MultiplyColor(material, 1.15f));
            CreateVisualPiece(root, PrimitiveType.Cylinder, landmark.label + "_PostA", new Vector3(landmark.x - landmark.width * 0.32f, 0.3f, landmark.z), new Vector3(0.06f, 0.28f, 0.06f), material);
            CreateVisualPiece(root, PrimitiveType.Cylinder, landmark.label + "_PostB", new Vector3(landmark.x + landmark.width * 0.32f, 0.3f, landmark.z), new Vector3(0.06f, 0.28f, 0.06f), material);
            CreateVisualPiece(root, PrimitiveType.Capsule, landmark.label + "_GuideStripA", new Vector3(landmark.x, 0.02f, landmark.z - landmark.depth * 0.56f), new Vector3(landmark.width * 0.34f, 0.01f, 0.08f), MultiplyColor(material, 0.9f));
            CreateVisualPiece(root, PrimitiveType.Capsule, landmark.label + "_GuideStripB", new Vector3(landmark.x, 0.02f, landmark.z + landmark.depth * 0.56f), new Vector3(landmark.width * 0.34f, 0.01f, 0.08f), MultiplyColor(material, 0.9f));
            CreateVisualPiece(root, PrimitiveType.Sphere, landmark.label + "_GuideLampA", new Vector3(landmark.x - landmark.width * 0.44f, 0.18f, landmark.z - 0.08f), new Vector3(0.12f, 0.12f, 0.12f), new Color(0.8f, 0.72f, 0.44f));
            CreateVisualPiece(root, PrimitiveType.Sphere, landmark.label + "_GuideLampB", new Vector3(landmark.x + landmark.width * 0.44f, 0.18f, landmark.z + 0.08f), new Vector3(0.12f, 0.12f, 0.12f), new Color(0.8f, 0.72f, 0.44f));
            CreateVisualPiece(root, PrimitiveType.Capsule, landmark.label + "_RingDetail", new Vector3(landmark.x, 0.08f, landmark.z), new Vector3(landmark.width * 0.22f, 0.015f, landmark.depth * 0.22f), MultiplyColor(material, 1.12f));
        }

        private static void CreateCanopy(Transform root, WorldPrototype3DLandmark landmark, Material material)
        {
            CreateVisualPiece(root, PrimitiveType.Capsule, landmark.label, new Vector3(landmark.x, 1.8f, landmark.z), new Vector3(landmark.width * 0.5f, 0.08f, landmark.depth * 0.42f), material);
            var dx = Mathf.Max(0.3f, landmark.width * 0.45f);
            var dz = Mathf.Max(0.3f, landmark.depth * 0.45f);
            CreateVisualPiece(root, PrimitiveType.Cylinder, landmark.label + "_PoleA", new Vector3(landmark.x - dx, 0.9f, landmark.z - dz), new Vector3(0.08f, 0.9f, 0.08f), material);
            CreateVisualPiece(root, PrimitiveType.Cylinder, landmark.label + "_PoleB", new Vector3(landmark.x + dx, 0.9f, landmark.z - dz), new Vector3(0.08f, 0.9f, 0.08f), material);
            CreateVisualPiece(root, PrimitiveType.Cylinder, landmark.label + "_PoleC", new Vector3(landmark.x - dx, 0.9f, landmark.z + dz), new Vector3(0.08f, 0.9f, 0.08f), material);
            CreateVisualPiece(root, PrimitiveType.Cylinder, landmark.label + "_PoleD", new Vector3(landmark.x + dx, 0.9f, landmark.z + dz), new Vector3(0.08f, 0.9f, 0.08f), material);
        }

        private static void CreateSignalPost(Transform root, WorldPrototype3DLandmark landmark, Material material)
        {
            CreateVisualPiece(root, PrimitiveType.Cylinder, landmark.label + "_Pole", new Vector3(landmark.x, landmark.height * 0.5f, landmark.z), new Vector3(0.1f, landmark.height * 0.5f, 0.1f), material);
            CreateVisualPiece(root, PrimitiveType.Sphere, landmark.label + "_Lamp", new Vector3(landmark.x, landmark.height + 0.18f, landmark.z), new Vector3(0.26f, 0.26f, 0.26f), PickMaterial(material, "signal", new Color(1f, 0.9f, 0.54f)));
        }

        private static void CreateCrateCluster(Transform root, WorldPrototype3DLandmark landmark, Material material)
        {
            CreateVisualPiece(root, PrimitiveType.Cylinder, landmark.label + "_Base", new Vector3(landmark.x, 0.12f, landmark.z), new Vector3(landmark.width * 0.5f, 0.09f, landmark.depth * 0.5f), material);
            CreateVisualPiece(root, PrimitiveType.Capsule, landmark.label + "_CrateA", new Vector3(landmark.x - 0.28f, 0.46f, landmark.z - 0.18f), new Vector3(0.28f, 0.24f, 0.28f), material);
            CreateVisualPiece(root, PrimitiveType.Capsule, landmark.label + "_CrateB", new Vector3(landmark.x + 0.26f, 0.42f, landmark.z + 0.1f), new Vector3(0.24f, 0.21f, 0.24f), material);
        }

        private static GameObject CreateVisualPiece(Transform parent, PrimitiveType primitiveType, string name, Vector3 localPosition, Vector3 localScale, Material material)
        {
            var piece = new GameObject(name);
            var meshFilter = piece.AddComponent<MeshFilter>();
            var meshRenderer = piece.AddComponent<MeshRenderer>();
            meshFilter.sharedMesh = GetPrimitiveMesh(primitiveType);
            piece.name = name;
            piece.transform.SetParent(parent, false);
            piece.transform.localPosition = localPosition;
            piece.transform.localScale = localScale;

            var renderer = meshRenderer;
            if (renderer != null && material != null)
            {
                renderer.sharedMaterial = material;
                if (IsGroundLikeName(name))
                {
                    renderer.shadowCastingMode = ShadowCastingMode.Off;
                    renderer.receiveShadows = false;
                }
            }

            return piece;
        }

        private static Mesh GetPrimitiveMesh(PrimitiveType primitiveType)
        {
            var meshName = primitiveType switch
            {
                PrimitiveType.Sphere => "Sphere.fbx",
                PrimitiveType.Capsule => "Capsule.fbx",
                PrimitiveType.Cylinder => "Cylinder.fbx",
                PrimitiveType.Cube => "Cube.fbx",
                PrimitiveType.Plane => "Plane.fbx",
                PrimitiveType.Quad => "Quad.fbx",
                _ => "Cube.fbx"
            };

            var mesh = Resources.GetBuiltinResource<Mesh>(meshName);
            if (mesh != null)
            {
                return mesh;
            }

            Debug.LogWarning("[DeepStakeDev] Missing builtin primitive mesh for " + primitiveType + ". Falling back to cube.");
            return Resources.GetBuiltinResource<Mesh>("Cube.fbx");
        }

        private static void StabilizeGroundRenderer(GameObject piece)
        {
            if (piece == null)
            {
                return;
            }

            piece.transform.localRotation = Quaternion.identity;
            var renderer = piece.GetComponent<Renderer>();
            if (renderer == null)
            {
                return;
            }

            renderer.shadowCastingMode = ShadowCastingMode.Off;
            renderer.receiveShadows = false;
        }

        private static bool IsGroundLikeName(string name)
        {
            var lower = name.ToLowerInvariant();
            return lower.Contains("ground")
                   || lower.Contains("tile")
                   || lower.Contains("road")
                   || lower.Contains("lane")
                   || lower.Contains("path")
                   || lower.Contains("field")
                   || lower.Contains("yard")
                   || lower.Contains("court")
                   || lower.Contains("meadow")
                   || lower.Contains("shoulder");
        }

        private static GameObject CreateVisualPiece(Transform parent, PrimitiveType primitiveType, string name, Vector3 localPosition, Vector3 localScale, Color color)
        {
            return CreateVisualPiece(parent, primitiveType, name, localPosition, localScale, CreateAutoMaterial(name, color));
        }

        private static Material CreateAutoMaterial(string name, Color fallbackColor)
        {
            return GetOrCreatePaletteMaterial(ResolvePaletteMaterialSpec(name, fallbackColor));
        }

        private static bool ShouldUseFlatGroundMaterial(string name)
        {
            var lower = name.ToLowerInvariant();
            return lower.Contains("stablepatch")
                   || lower.Contains("terrainground")
                   || lower.Contains("terrainbase")
                   || lower.Contains("packedearth")
                   || lower.Contains("continuous")
                   || lower.Contains("villagepackedearthbase")
                   || lower.Contains("outerfieldterrainbase")
                   || lower.Contains("connector")
                   || lower.Contains("shoulder")
                   || lower.Contains("meadow")
                   || lower.Contains("fieldfill")
                   || lower.Contains("recoveryfield")
                   || lower.Contains("roof")
                   || lower.Contains("eave")
                   || lower.Contains("gable");
        }

        private static Texture2D GetEnvironmentTexture(string name)
        {
            EnsureEnvironmentTexturesLoaded();
            var key = name == null ? string.Empty : name.ToLowerInvariant();
            if (key.Contains("wall") || key.Contains("roof") || key.Contains("door") || key.Contains("window") || key.Contains("gate") || key.Contains("fence") || key.Contains("rear") || key.Contains("store") || key.Contains("shack") || key.Contains("canopy"))
            {
                return cachedWallTextures.Length > 0 ? cachedWallTextures[Mathf.Abs(key.GetHashCode()) % cachedWallTextures.Length] : null;
            }

            if (key.Contains("road") || key.Contains("path") || key.Contains("strip") || key.Contains("lane") || key.Contains("walk"))
            {
                return cachedTileTextures.Length > 1 ? cachedTileTextures[1] : cachedTileTextures.Length > 0 ? cachedTileTextures[0] : null;
            }

            if (key.Contains("field") || key.Contains("farm") || key.Contains("patch") || key.Contains("mud") || key.Contains("grass") || key.Contains("stone") || key.Contains("site"))
            {
                return cachedTileTextures.Length > 0 ? cachedTileTextures[0] : null;
            }

            return null;
        }

        private static Texture2D GetPaletteTexture(PaletteTextureKind textureKind)
        {
            EnsureEnvironmentTexturesLoaded();

            return textureKind switch
            {
                PaletteTextureKind.DrySoil => FindEnvironmentTexture(cachedTileTextures, "DS_Village_dirt_tile"),
                PaletteTextureKind.DirtPath => FindEnvironmentTexture(cachedTileTextures, "DS_Village_road_tile"),
                PaletteTextureKind.MixedDirtGrass => FindEnvironmentTexture(cachedTileTextures, "DS_Village_field_rows") ?? FindEnvironmentTexture(cachedTileTextures, "DS_Village_dirt_tile"),
                PaletteTextureKind.RecoveringGrass => FindEnvironmentTexture(cachedTileTextures, "DS_Village_field_rows"),
                PaletteTextureKind.GravelStorage => FindEnvironmentTexture(cachedTileTextures, "DS_Village_stone_tile"),
                PaletteTextureKind.WornConcrete => FindEnvironmentTexture(cachedTileTextures, "DS_Village_stone_tile"),
                PaletteTextureKind.CrackedPressure => FindEnvironmentTexture(cachedTileTextures, "crack", "pressure", "damage", "ChatGPT") ?? FindEnvironmentTexture(cachedTileTextures, "DS_Village_stone_tile"),
                PaletteTextureKind.WallPlaster => FindEnvironmentTexture(cachedWallTextures, "DS_Village_recovery_wall") ?? FindEnvironmentTexture(cachedWallTextures, "plaster"),
                PaletteTextureKind.WornWood => FindEnvironmentTexture(cachedWallTextures, "DS_Village_wood_wall"),
                PaletteTextureKind.MutedMetal => FindEnvironmentTexture(cachedWallTextures, "DS_Village_archive_wall") ?? FindEnvironmentTexture(cachedWallTextures, "metal"),
                PaletteTextureKind.RoofDark => FindEnvironmentTexture(cachedWallTextures, "DS_Village_roof_dark"),
                PaletteTextureKind.RoofWarm => FindEnvironmentTexture(cachedWallTextures, "DS_Village_roof_warm"),
                PaletteTextureKind.DoorWood => FindEnvironmentTexture(cachedWallTextures, "DS_Village_door_wood"),
                PaletteTextureKind.WindowMuted => FindEnvironmentTexture(cachedWallTextures, "DS_Village_window_muted"),
                _ => null
            };
        }

        private static Texture2D FindEnvironmentTexture(Texture2D[] textures, params string[] preferredTokens)
        {
            if (textures == null || textures.Length == 0)
            {
                return null;
            }

            for (var index = 0; index < textures.Length; index++)
            {
                var texture = textures[index];
                if (texture == null)
                {
                    continue;
                }

                var textureName = texture.name.ToLowerInvariant();
                var matched = true;
                for (var tokenIndex = 0; tokenIndex < preferredTokens.Length; tokenIndex++)
                {
                    var token = preferredTokens[tokenIndex].ToLowerInvariant();
                    if (!textureName.Contains(token))
                    {
                        matched = false;
                        break;
                    }
                }

                if (matched)
                {
                    return texture;
                }
            }

            return null;
        }

        private static Vector2 GetEnvironmentTiling(string name)
        {
            var key = name == null ? string.Empty : name.ToLowerInvariant();
            if (key.Contains("road") || key.Contains("path") || key.Contains("strip") || key.Contains("lane") || key.Contains("walk"))
            {
                return new Vector2(4f, 2f);
            }

            if (key.Contains("roof"))
            {
                return new Vector2(2.5f, 1.5f);
            }

            if (key.Contains("wall") || key.Contains("door") || key.Contains("window") || key.Contains("gate") || key.Contains("fence") || key.Contains("rear") || key.Contains("store") || key.Contains("shack"))
            {
                return new Vector2(2f, 2f);
            }

            return new Vector2(3f, 3f);
        }

        private static PaletteMaterialSpec ResolvePaletteMaterialSpec(string name, Color fallbackColor)
        {
            var key = name == null ? string.Empty : name.ToLowerInvariant();

            if (key.Contains("beacon") || key.Contains("lamp"))
            {
                return new PaletteMaterialSpec(BeaconRecoveryGlowMaterialName, PaletteTextureKind.None, new Color(0.64f, 0.54f, 0.34f), Vector2.one, true);
            }

            if (key.Contains("sign") || key.Contains("noticeboard") || key.Contains("markerpanel"))
            {
                return new PaletteMaterialSpec(PropAgedMetalSignMaterialName, PaletteTextureKind.MutedMetal, new Color(0.46f, 0.44f, 0.4f), new Vector2(1.1f, 1.1f));
            }

            if (key.Contains("crate") || key.Contains("supply") || key.Contains("barrel") || key.Contains("spool"))
            {
                return new PaletteMaterialSpec(PropSupplyCrateMaterialName, PaletteTextureKind.WornWood, new Color(0.58f, 0.49f, 0.36f), new Vector2(1.6f, 1.6f));
            }

            if (key.Contains("roof"))
            {
                var roofKind = key.Contains("clinic") || key.Contains("archive") ? PaletteTextureKind.RoofDark : PaletteTextureKind.RoofWarm;
                var roofName = roofKind == PaletteTextureKind.RoofDark ? BuildingRoofDarkMaterialName : BuildingRoofWarmMaterialName;
                var roofTint = roofKind == PaletteTextureKind.RoofDark
                    ? new Color(0.4f, 0.41f, 0.39f)
                    : new Color(0.51f, 0.47f, 0.4f);
                return new PaletteMaterialSpec(roofName, roofKind, roofTint, new Vector2(1.65f, 1.2f));
            }

            if (key.Contains("door"))
            {
                return new PaletteMaterialSpec("DS_Building_DoorWood", PaletteTextureKind.DoorWood, new Color(0.5f, 0.42f, 0.31f), new Vector2(1.05f, 1.55f));
            }

            if (key.Contains("window"))
            {
                return new PaletteMaterialSpec("DS_Building_WindowMuted", PaletteTextureKind.WindowMuted, new Color(0.45f, 0.5f, 0.54f), new Vector2(1f, 1f));
            }

            if (key.Contains("wall") || key.Contains("building") || key.Contains("shack") || key.Contains("store") || key.Contains("house"))
            {
                var wallKind = key.Contains("archive") || key.Contains("clinic")
                    ? PaletteTextureKind.WallPlaster
                    : key.Contains("warehouse") || key.Contains("workshop") || key.Contains("pump")
                        ? PaletteTextureKind.MutedMetal
                        : PaletteTextureKind.WornWood;
                var wallName = wallKind switch
                {
                    PaletteTextureKind.WallPlaster => BuildingWallPlasterMaterialName,
                    PaletteTextureKind.MutedMetal => BuildingMutedMetalMaterialName,
                    _ => BuildingWornWoodMaterialName
                };
                var wallTint = wallKind switch
                {
                    PaletteTextureKind.WallPlaster => new Color(0.5f, 0.47f, 0.42f),
                    PaletteTextureKind.MutedMetal => new Color(0.42f, 0.44f, 0.43f),
                    _ => new Color(0.47f, 0.4f, 0.32f)
                };
                return new PaletteMaterialSpec(wallName, wallKind, wallTint, new Vector2(1.6f, 1.6f));
            }

            if (key.Contains("foundation") || key.Contains("floor") || key.Contains("pad"))
            {
                return new PaletteMaterialSpec(GroundWornConcreteMaterialName, PaletteTextureKind.WornConcrete, new Color(0.49f, 0.44f, 0.38f), new Vector2(1.55f, 1.55f));
            }

            if (key.Contains("path") || key.Contains("road") || key.Contains("lane") || key.Contains("walk") || key.Contains("step") || key.Contains("porch") || key.Contains("deck"))
            {
                var cleanRoute = key.Contains("connector") || key.Contains("base") || key.Contains("terrain");
                var usesWoodPlatform = key.Contains("porch") || key.Contains("deck") || key.Contains("post") || key.Contains("rail") || key.Contains("stair");
                if (usesWoodPlatform)
                {
                    return new PaletteMaterialSpec(BuildingWornWoodMaterialName, PaletteTextureKind.WornWood, new Color(0.46f, 0.39f, 0.31f), new Vector2(1.4f, 1.4f));
                }

                return new PaletteMaterialSpec(
                    GroundDirtPathMaterialName,
                    PaletteTextureKind.DirtPath,
                    new Color(0.56f, 0.48f, 0.37f),
                    new Vector2(1.7f, 1.7f),
                    cleanRoute);
            }

            if (key.Contains("storage") || key.Contains("archiveyard") || key.Contains("court") || key.Contains("stone") || key.Contains("service") || key.Contains("mat"))
            {
                return new PaletteMaterialSpec(GroundGravelStorageMaterialName, PaletteTextureKind.GravelStorage, new Color(0.53f, 0.48f, 0.41f), new Vector2(1.9f, 1.9f));
            }

            if (key.Contains("fieldrow") || key.Contains("recoveryfield") || key.Contains("farmapron"))
            {
                return new PaletteMaterialSpec(GroundMixedDirtGrassMaterialName, PaletteTextureKind.MixedDirtGrass, new Color(0.48f, 0.49f, 0.38f), new Vector2(1.85f, 1.85f));
            }

            if (key.Contains("pressure") || key.Contains("crack") || key.Contains("damaged"))
            {
                return new PaletteMaterialSpec(GroundCrackedPressureMaterialName, PaletteTextureKind.CrackedPressure, new Color(0.37f, 0.35f, 0.34f), new Vector2(2.1f, 2.1f));
            }

            if (key.Contains("tree") || key.Contains("leaf") || key.Contains("grassborder"))
            {
                return new PaletteMaterialSpec(FoliageCanopyMaterialName, PaletteTextureKind.None, new Color(0.28f, 0.37f, 0.24f), Vector2.one, true);
            }

            if (key.Contains("fence") || key.Contains("gate") || key.Contains("stake") || key.Contains("post") || key.Contains("bench") || key.Contains("shelf"))
            {
                return new PaletteMaterialSpec(BuildingWornWoodMaterialName, PaletteTextureKind.WornWood, new Color(0.45f, 0.38f, 0.29f), new Vector2(1.45f, 1.45f));
            }

            if (key.Contains("field") || key.Contains("grass") || key.Contains("hedge") || key.Contains("meadow"))
            {
                var keepBroadAreasSimple = key.Contains("terrainbase") || key.Contains("fieldfill") || key.Contains("meadow");
                return new PaletteMaterialSpec(
                    GroundRecoveringGrassMaterialName,
                    PaletteTextureKind.RecoveringGrass,
                    new Color(0.45f, 0.5f, 0.39f),
                    new Vector2(2.15f, 2.15f),
                    keepBroadAreasSimple);
            }

            if (key.Contains("terrain") || key.Contains("soil") || key.Contains("dirt") || key.Contains("mud") || key.Contains("plot") || key.Contains("farm"))
            {
                var keepBroadAreasSimple = key.Contains("terrainbase") || key.Contains("packedearth") || key.Contains("sitebase") || key.Contains("continuous");
                return new PaletteMaterialSpec(
                    GroundDrySoilMaterialName,
                    PaletteTextureKind.DrySoil,
                    new Color(0.55f, 0.47f, 0.36f),
                    new Vector2(1.95f, 1.95f),
                    keepBroadAreasSimple);
            }

            return new PaletteMaterialSpec("DS_Generic_Muted", PaletteTextureKind.None, fallbackColor, Vector2.one, ShouldUseFlatGroundMaterial(name));
        }

        private static Material GetOrCreatePaletteMaterial(PaletteMaterialSpec spec)
        {
            if (paletteMaterials.TryGetValue(spec.MaterialName, out var existing) && existing != null)
            {
                return existing;
            }

            var shader = Shader.Find("Universal Render Pipeline/Lit");
            if (shader == null)
            {
                shader = Shader.Find("Standard");
            }

            var material = new Material(shader)
            {
                name = spec.MaterialName,
                hideFlags = HideFlags.DontSave
            };

            if (material.HasProperty("_BaseColor"))
            {
                material.SetColor("_BaseColor", spec.ColorTint);
            }
            if (material.HasProperty("_Color"))
            {
                material.color = spec.ColorTint;
            }

            if (!spec.PreferFlatShading)
            {
                var texture = GetPaletteTexture(spec.TextureKind);
                if (texture != null)
                {
                    if (material.HasProperty("_BaseMap"))
                    {
                        material.SetTexture("_BaseMap", texture);
                        material.SetTextureScale("_BaseMap", spec.Tiling);
                    }
                    if (material.HasProperty("_MainTex"))
                    {
                        material.SetTexture("_MainTex", texture);
                        material.SetTextureScale("_MainTex", spec.Tiling);
                    }
                }
            }

            if (material.HasProperty("_Smoothness"))
            {
                var smoothness = 0.04f;
                if (spec.MaterialName == BeaconRecoveryGlowMaterialName)
                {
                    smoothness = 0.12f;
                }
                else if (spec.MaterialName == BuildingMutedMetalMaterialName || spec.MaterialName == BuildingRoofDarkMaterialName || spec.MaterialName == BuildingRoofWarmMaterialName || spec.MaterialName == PropAgedMetalSignMaterialName)
                {
                    smoothness = 0.11f;
                }

                material.SetFloat("_Smoothness", smoothness);
            }

            if (material.HasProperty("_OcclusionStrength"))
            {
                material.SetFloat("_OcclusionStrength", spec.MaterialName == BeaconRecoveryGlowMaterialName ? 0.45f : 0.72f);
            }

            if (spec.MaterialName == BeaconRecoveryGlowMaterialName && material.HasProperty("_EmissionColor"))
            {
                material.EnableKeyword("_EMISSION");
                material.SetColor("_EmissionColor", spec.ColorTint * 0.45f);
            }

            paletteMaterials[spec.MaterialName] = material;
            return material;
        }

        private static void EnsureEnvironmentTexturesLoaded()
        {
            if (environmentTexturesLoaded)
            {
                return;
            }

            environmentTexturesLoaded = true;
            cachedTileTextures = Resources.LoadAll<Texture2D>("Environment/Tiles");
            cachedWallTextures = Resources.LoadAll<Texture2D>("Environment/Walls");
        }

        private static Material PickMaterial(Material baseMaterial, string accent, Color fallbackColor)
        {
            if (baseMaterial == null)
            {
                return GetOrCreatePaletteMaterial(ResolvePaletteMaterialSpec("palette_" + accent, fallbackColor));
            }

            var accentColor = fallbackColor;
            switch (accent)
            {
                case "warm":
                    accentColor = new Color(0.5f, 0.45f, 0.34f);
                    break;
                case "calm":
                    accentColor = new Color(0.35f, 0.4f, 0.43f);
                    break;
                case "signal":
                    accentColor = new Color(0.53f, 0.49f, 0.35f);
                    break;
            }

            if (baseMaterial != null)
            {
                var clone = new Material(baseMaterial);
                clone.name = "DS_RuntimeAccent_" + accent;
                if (clone.HasProperty("_BaseColor"))
                {
                    clone.SetColor("_BaseColor", accentColor);
                }
                if (clone.HasProperty("_Color"))
                {
                    clone.color = accentColor;
                }
                return clone;
            }

            var shader = Shader.Find("Universal Render Pipeline/Lit");
            if (shader == null)
            {
                shader = Shader.Find("Standard");
            }

            var material = new Material(shader);
            if (material.HasProperty("_BaseColor"))
            {
                material.SetColor("_BaseColor", accentColor);
            }
            if (material.HasProperty("_Color"))
            {
                material.color = accentColor;
            }
            return material;
        }

        private static Material MultiplyColor(Material sourceMaterial, float multiplier)
        {
            if (sourceMaterial == null)
            {
                return PickMaterial(null, string.Empty, new Color(0.65f * multiplier, 0.65f * multiplier, 0.65f * multiplier));
            }

            var clone = new Material(sourceMaterial);
            var color = new Color(1f, 1f, 1f);
            if (clone.HasProperty("_BaseColor"))
            {
                color = clone.GetColor("_BaseColor");
                clone.SetColor("_BaseColor", color * multiplier);
            }
            if (clone.HasProperty("_Color"))
            {
                color = clone.color;
                clone.color = color * multiplier;
            }
            return clone;
        }
    }
}
