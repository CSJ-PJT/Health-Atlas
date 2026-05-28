using DeepStake.Core;
using DeepStake.Characters;
using DeepStake.Player;
using UnityEngine;

namespace DeepStake.Quests
{
    public sealed class QuestNpc3DStub : MonoBehaviour
    {
        [SerializeField] private string npcId = "archivist";
        [SerializeField] private string displayName = "Archivist";
        [SerializeField] [TextArea] private string dialogue =
            "The archive listens for the first proof that this ground can recover.";
        [SerializeField] private string questId = "first-harvest";
        [SerializeField] private float talkRange = 2.4f;
        [SerializeField] private float awarenessRange = 5.5f;
        [SerializeField] private float patrolSpeed = 0.72f;
        [SerializeField] private float turnSpeed = 5.5f;
        [SerializeField] private float waypointReachDistance = 0.18f;

        private ArticulatedHumanoidView humanoidView;
        private PlayerMover3D playerMover;
        private CharacterController characterController;
        private Vector3 homePosition;
        private Vector3[] patrolPoints = System.Array.Empty<Vector3>();
        private int patrolIndex;
        private float waitTimer;
        private float stuckTimer;
        private bool patrolInitialized;

        public void Configure(string nextNpcId, string nextQuestId, string nextDialogue)
        {
            npcId = nextNpcId;
            questId = nextQuestId;
            dialogue = nextDialogue;
            displayName = nextNpcId;
            if (humanoidView != null)
            {
                humanoidView.Configure(npcId == "field-hand" ? ArticulatedHumanoidRole.FieldWorker : ArticulatedHumanoidRole.Archivist);
            }
            ResetPatrol();
        }

        public void Configure(string nextNpcId, string nextDisplayName, string nextQuestId, string nextDialogue)
        {
            npcId = nextNpcId;
            displayName = nextDisplayName;
            questId = nextQuestId;
            dialogue = nextDialogue;
            if (humanoidView != null)
            {
                humanoidView.Configure(npcId == "field-hand" ? ArticulatedHumanoidRole.FieldWorker : ArticulatedHumanoidRole.Archivist);
            }
            ResetPatrol();
        }

        private void Awake()
        {
            characterController = GetComponent<CharacterController>();
            if (characterController == null)
            {
                characterController = gameObject.AddComponent<CharacterController>();
            }

            characterController.center = new Vector3(0f, 0.55f, 0f);
            characterController.height = 1.9f;
            characterController.radius = 0.34f;
            characterController.stepOffset = 0.22f;
            characterController.slopeLimit = 42f;

            humanoidView = GetComponent<ArticulatedHumanoidView>();
            if (humanoidView == null)
            {
                humanoidView = gameObject.AddComponent<ArticulatedHumanoidView>();
            }
            humanoidView.Configure(npcId == "field-hand" ? ArticulatedHumanoidRole.FieldWorker : ArticulatedHumanoidRole.Archivist);
            ResetPatrol();
        }

        private void Update()
        {
            if (playerMover == null)
            {
                playerMover = FindFirstObjectByType<PlayerMover3D>();
            }

            if (humanoidView == null)
            {
                return;
            }

            EnsurePatrolInitialized();
            if (playerMover == null)
            {
                humanoidView.ClearAttention();
                UpdateStationaryOrPatrol();
                return;
            }

            var distance = GetDistance(playerMover.transform);
            if (distance <= 1.45f)
            {
                FaceTarget(playerMover.transform.position, 1f);
                humanoidView.SetMotion(Vector3.zero, patrolSpeed);
                return;
            }

            if (distance <= awarenessRange)
            {
                humanoidView.SetAttentionTarget(playerMover.transform.position, Mathf.InverseLerp(awarenessRange, talkRange, distance));
            }
            else
            {
                humanoidView.ClearAttention();
            }

            UpdateStationaryOrPatrol();
        }

        public bool CanTalk(Transform actor)
        {
            return GetDistance(actor) <= talkRange;
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
            return "Q Talk  " + displayName;
        }

        public string GetLabel()
        {
            return displayName;
        }

        public void Talk()
        {
            if (DeepStakeGameState.Instance == null)
            {
                return;
            }

            var save = DeepStakeGameState.Instance.CurrentSave;
            var wasMetFieldHand = save.StoryFlags.MetFieldHand;
            save.StoryFlags.MetArchivist |= npcId == "archivist";
            save.StoryFlags.MetFieldHand |= npcId == "field-hand";
            save.StoryFlags.MetMechanic |= npcId == "mechanic";
            save.StoryFlags.LearnedDirectoratePressure |= npcId == "archivist";

            var resolvedDialogue = ResolveDialogue(save, wasMetFieldHand);

            foreach (var quest in save.Quests)
            {
                if (quest.QuestId != questId)
                {
                    continue;
                }

                if (quest.Status != "completed")
                {
                    quest.Status = save.StoryFlags.ReviewedSupplyCrate ? "ready-for-beacon" : "met-archivist";
                    save.Alignment.AwakeningClarity += 1;
                    save.Alignment.Compassion += 1;
                }
                break;
            }

            save.LastStatus = displayName + ": " + resolvedDialogue;
            DeepStakeGameState.Instance.UpdateStatus(save.LastStatus);
            if (humanoidView != null && playerMover != null)
            {
                humanoidView.PlayAction(ArticulatedHumanoidAction.Talk, playerMover.transform.position);
            }
        }

        private void ResetPatrol()
        {
            patrolInitialized = false;
            patrolIndex = 0;
            waitTimer = 0.45f;
            stuckTimer = 0f;
        }

        private void EnsurePatrolInitialized()
        {
            if (patrolInitialized)
            {
                return;
            }

            homePosition = new Vector3(transform.position.x, 0.5f, transform.position.z);
            transform.position = homePosition;
            var isFieldHand = npcId == "field-hand";
            patrolSpeed = isFieldHand ? 0.72f : 0.5f;
            patrolPoints = isFieldHand
                ? new[]
                {
                    homePosition + new Vector3(0.55f, 0f, -0.6f),
                    homePosition + new Vector3(1.2f, 0f, -1.35f),
                    homePosition + new Vector3(-0.55f, 0f, -1.15f),
                    homePosition + new Vector3(-0.85f, 0f, 0.35f)
                }
                : new[]
                {
                    homePosition + new Vector3(0.35f, 0f, -0.45f),
                    homePosition + new Vector3(1.1f, 0f, -0.15f),
                    homePosition + new Vector3(0.75f, 0f, 0.75f),
                    homePosition + new Vector3(-0.35f, 0f, 0.45f)
                };
            patrolInitialized = true;
        }

        private void UpdatePatrol()
        {
            if (patrolPoints == null || patrolPoints.Length == 0)
            {
                humanoidView.SetMotion(Vector3.zero, patrolSpeed);
                return;
            }

            if (waitTimer > 0f)
            {
                waitTimer -= Time.deltaTime;
                humanoidView.SetMotion(Vector3.zero, patrolSpeed);
                return;
            }

            var target = patrolPoints[Mathf.Clamp(patrolIndex, 0, patrolPoints.Length - 1)];
            var toTarget = target - transform.position;
            toTarget.y = 0f;
            var distance = toTarget.magnitude;
            if (distance <= waypointReachDistance)
            {
                patrolIndex = (patrolIndex + 1) % patrolPoints.Length;
                waitTimer = npcId == "field-hand" ? 0.35f : 0.7f;
                humanoidView.SetMotion(Vector3.zero, patrolSpeed);
                return;
            }

            var direction = toTarget.normalized;
            FaceDirection(direction);
            var motion = direction * patrolSpeed;
            var before = transform.position;
            if (characterController != null && characterController.enabled)
            {
                var flags = characterController.Move((motion + Physics.gravity * 0.08f) * Time.deltaTime);
                if ((flags & CollisionFlags.Sides) != 0)
                {
                    AdvanceAfterBlocked();
                }
            }
            else
            {
                transform.position += motion * Time.deltaTime;
            }

            var moved = Vector3.Distance(before, transform.position);
            if (moved < 0.002f)
            {
                stuckTimer += Time.deltaTime;
                if (stuckTimer > 0.55f)
                {
                    AdvanceAfterBlocked();
                }
            }
            else
            {
                stuckTimer = 0f;
            }

            var planarMotion = new Vector3(motion.x, 0f, motion.z);
            humanoidView.SetMotion(planarMotion, patrolSpeed, false);
        }

        private void UpdateStationaryOrPatrol()
        {
            if (npcId != "field-hand")
            {
                humanoidView.HoldStationaryIdle();
                return;
            }

            UpdatePatrol();
        }

        private void AdvanceAfterBlocked()
        {
            stuckTimer = 0f;
            waitTimer = 0.3f;
            patrolIndex = (patrolIndex + 1) % patrolPoints.Length;
            var nudge = transform.forward;
            nudge.y = 0f;
            if (nudge.sqrMagnitude < 0.001f)
            {
                nudge = Vector3.right;
            }

            transform.position = new Vector3(transform.position.x, 0.5f, transform.position.z) - nudge.normalized * 0.08f;
        }

        private void FaceDirection(Vector3 direction)
        {
            if (direction.sqrMagnitude < 0.001f)
            {
                return;
            }

            var desiredRotation = Quaternion.LookRotation(direction, Vector3.up);
            transform.rotation = Quaternion.Slerp(transform.rotation, desiredRotation, turnSpeed * Time.deltaTime);
        }

        private void FaceTarget(Vector3 target, float attention)
        {
            var toTarget = target - transform.position;
            toTarget.y = 0f;
            FaceDirection(toTarget.normalized);
            humanoidView.SetAttentionTarget(target, attention);
        }

        private string ResolveDialogue(DeepStake.Contracts.DeepStakeSaveData save, bool wasMetFieldHand)
        {
            if (npcId != "archivist")
            {
                if (npcId == "field-hand")
                {
                    if (!save.StoryFlags.PlacedRecoveryBeacon)
                    {
                        return "I can clear the lane once the beacon is steady. Get the anchor up first.";
                    }

                    if (!wasMetFieldHand)
                    {
                        return "Good. The beacon gave us one steady line again. I marked an observer case by the archive fence. Check it before the next lane goes dark.";
                    }

                    return "The lane is breathing again. We can move supplies, but only if the record trail holds.";
                }

                return dialogue;
            }

            if (!save.StoryFlags.ReadFieldNoticeBoard)
            {
                return "Read the authority notice first. The crop order and the land transfer should not share the same seal, but they do.";
            }

            if (!save.StoryFlags.ReviewedSupplyCrate)
            {
                return "Check the delayed supply crates next. The route sheets were cut and stamped twice.";
            }

            if (!save.StoryFlags.PlacedRecoveryBeacon)
            {
                return "That is enough proof for now. Anchor one recovery beacon before the lane closes again.";
            }

            return "Good. The beacon held. We have a stable record, a supply trace, and one anchored recovery point.";
        }
    }
}
