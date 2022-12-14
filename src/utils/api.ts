export async function apiGetActiveSeason(): Promise<CompetitionSeason | null> {
  const activeSeason = useActiveSeason();
  if (activeSeason.value) {
    return activeSeason.value;
  } else {
    const { $scripts } = useNuxtApp();
    const result = await $scripts.getActiveSeason();
    activeSeason.value = result;
    return result;
  }
}

export async function apiGetCurrentChallenge(
  defaultBountyId: string
): Promise<BountyInfo | null> {
  const current = useCurrentChallenge();
  let challenge: BountyInfo | null;
  if (current.value) {
    challenge = current.value;
  } else {
    const { $scripts } = useNuxtApp();
    const season = await apiGetActiveSeason();
    if (season) {
      challenge = await $scripts.getBountyById(
        season.seasonId,
        defaultBountyId
      );
    } else {
      challenge = null;
    }
  }
  return challenge;
}

export async function apiGetCurrentQuest(
  defaultQuestKey: string
): Promise<BountyInfo | null> {
  const current = useCurrentQuest();
  let quest: BountyInfo | null;
  if (current.value) {
    quest = current.value;
  } else {
    const { $scripts } = useNuxtApp();
    const season = await apiGetActiveSeason();
    if (season) {
      quest = await $scripts.getBountyByKey(season.seasonId, defaultQuestKey);
    } else {
      quest = null;
    }
  }
  return quest;
}

const communityPromises: { [key: string]: Promise<CommunityBasics | null> } =
  {};

export async function apiGetCommunityBasics(
  communityId: string
): Promise<CommunityBasics | null> {
  const community = useCommunityBasics(communityId);
  let result: CommunityBasics | null;
  if (community.value) {
    result = community.value;
  } else {
    const existsPromise = communityPromises[communityId];
    if (existsPromise) {
      result = community.value = await existsPromise;
    } else {
      const { $scripts } = useNuxtApp();
      communityPromises[communityId] = $scripts.getCommunityBasics(communityId);
      result = community.value = await communityPromises[communityId];
    }
  }
  return result;
}

export async function apiGetCurrentUser(): Promise<ProfileData | null> {
  const current = useUserProfile();
  let user: ProfileData | null;
  if (current.value) {
    user = current.value;
  } else {
    user = await reloadCurrentUser();
  }
  return user;
}

export async function reloadCurrentUser(
  ignores: { ignoreIdentities?: boolean; ignoreSeason?: boolean } = {}
): Promise<ProfileData | null> {
  const current = useUserProfile();
  const wallet = useFlowAccount();
  if (!wallet.value?.loggedIn) {
    return null;
  }

  const address = wallet.value.addr!;
  const profile = (await loadUserProfile(address, ignores)) ?? {
    address,
    activeRecord: undefined,
    linkedIdentities: {},
  };

  if (current.value) {
    if (ignores.ignoreIdentities) {
      profile.linkedIdentities = current.value?.linkedIdentities;
    }
    if (ignores.ignoreSeason) {
      profile.activeRecord = current.value?.activeRecord;
    }
  }

  current.value = profile;
  return current.value;
}

export async function reloadCurrentProfile(
  defaultAddress: string
): Promise<ProfileData | null> {
  const currentProfile = useCurrentProfile();
  const address = currentProfile.value
    ? currentProfile.value?.address
    : defaultAddress;
  const profile = await loadUserProfile(address);
  currentProfile.value = profile;
  return profile;
}

export async function loadUserProfile(
  address: string,
  ignores: { ignoreIdentities?: boolean; ignoreSeason?: boolean } = {}
): Promise<ProfileData | null> {
  if (!address) return null;

  const { $scripts } = useNuxtApp();

  let activeRecord: SeasonRecord | undefined;
  const linkedIdentities: { [key: string]: ProfileIdentity } = {};

  if (!ignores.ignoreIdentities) {
    const identities = await $scripts.loadProfileGetIdentities(address);
    for (const identity of identities) {
      linkedIdentities[identity.platform] = identity;
    }
  }

  if (!ignores.ignoreSeason) {
    activeRecord = await $scripts.loadProfileSeasonRecord(address);
  }

  return {
    address,
    activeRecord,
    linkedIdentities,
  };
}

export async function fetchAccountProof() {
  const { $fcl } = useNuxtApp();
  const user = await $fcl.currentUser.snapshot();
  const accountProof = user.services?.find(
    (one) => one.type === "account-proof"
  );
  if (!accountProof) {
    console.log("accountProof not found");
    throw new Error("accountProof not found");
  }
  return {
    address: user.addr,
    proofNonce: accountProof.data.nonce,
    proofSigs: accountProof.data.signatures,
  };
}

function handleResponseError(e: any): { code: string; message: string } {
  console.log(e.response);
  if (
    typeof e.response?._data === "object" ||
    typeof e.response?.data === "object"
  ) {
    const data = e.response?._data || e.response?.data;
    console.warn(`ErrorResponse: `, JSON.stringify(data));
    return {
      code:
        data.error?.code ??
        String(data.statusCode) ??
        String(e.response.status) ??
        "500",
      message:
        data.error?.message ??
        data.message ??
        e.response.statusText ??
        "Unknown Error",
    };
  } else {
    console.warn(`ErrorMsg:`, e.message);
    return { code: "500", message: e.message };
  }
}

export async function apiPostVerifyQuest(
  questIdentifier: BountyIdentifier,
  step: number,
  questParams: { key: string; value: string }[]
): Promise<ResponseVerifyQuest> {
  try {
    const result = await $fetch("/api/verify-quest", {
      method: "post",
      body: Object.assign(
        {
          communityId: questIdentifier.communityId,
          questKey: questIdentifier.key,
          step,
          questParams,
        },
        await fetchAccountProof()
      ),
    });
    return result;
  } catch (e: any) {
    return { ok: false, error: handleResponseError(e) };
  }
}

export async function apiPostCompleteBounty(
  bountyId: string
): Promise<ResponseCompleteBounty> {
  try {
    const result = await $fetch("/api/complete-bounty", {
      method: "post",
      body: Object.assign(
        {
          bountyId: bountyId,
        },
        await fetchAccountProof()
      ),
    });
    return result;
  } catch (e) {
    return { ok: false, error: handleResponseError(e) };
  }
}

export async function apiPostGenerateReferralCode(): Promise<ResponseReferralCodeGenerate> {
  try {
    const result = await $fetch("/api/generate-referral-code", {
      method: "post",
      body: Object.assign({}, await fetchAccountProof()),
    });
    return result;
  } catch (e) {
    return { ok: false, error: handleResponseError(e) };
  }
}
