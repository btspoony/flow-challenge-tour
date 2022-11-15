/**
## The contract of user profile

> Author: Bohao Tang<tech@btang.cn>

*/
import Interfaces from "./Interfaces.cdc"

pub contract UserProfile {

    /**    ___  ____ ___ _  _ ____
       *   |__] |__|  |  |__| [__
        *  |    |  |  |  |  | ___]
         *************************/

    pub let ProfileStoragePath: StoragePath;
    pub let ProfilePublicPath: PublicPath;

    /**    ____ _  _ ____ _  _ ___ ____
       *   |___ |  | |___ |\ |  |  [__
        *  |___  \/  |___ | \|  |  ___]
         ******************************/
    pub event ContractInitialized()
    pub event ProfileCreated(profileId: UInt64)
    pub event ProfileUpsertIdentity(profile: Address, platform: String, uid: String, name: String, image: String)

    pub event ProfileSeasonAddPoints(profile: Address, seasonId: UInt64, points: UInt64)
    pub event ProfileSeasonNewSeason(profile: Address, seasonId: UInt64, referredFrom: String?)
    pub event QuestRecordAppendNewParams(profile: Address, seasonId: UInt64, questKey: String, keys: [String])
    pub event QuestRecordUpdateVerificationResult(profile: Address, seasonId: UInt64, questKey: String, index: Int, result: Bool)
    pub event QuestRecordSetupReferralCode(profile: Address, seasonId: UInt64, code: String)

    /**    ____ ___ ____ ___ ____
       *   [__   |  |__|  |  |___
        *  ___]  |  |  |  |  |___
         ************************/

    pub var totalProfiles: UInt64

    /**    ____ _  _ _  _ ____ ___ _ ____ _  _ ____ _    _ ___ _   _
       *   |___ |  | |\ | |     |  | |  | |\ | |__| |    |  |   \_/
        *  |    |__| | \| |___  |  | |__| | \| |  | |___ |  |    |
         ***********************************************************/

    pub struct QuestRecord {
        pub var timesCompleted: UInt64
        pub var verificationParams: [{String: AnyStruct}]
        pub var verificationResults: {Int: Bool}

        init() {
            self.timesCompleted = 0
            self.verificationParams = []
            self.verificationResults = {}
        }

        pub fun getLatestIndex(): Int {
            pre {
                self.verificationParams.length > 0: "no params"
            }
            return self.verificationParams.length - 1
        }

        pub fun getLatestParams(): {String: AnyStruct} {
            return self.verificationParams[self.getLatestIndex()]
        }

        pub fun getLatestResult(): Bool? {
            return self.verificationResults[self.getLatestIndex()]
        }

        access(contract) fun appendNewParams(params: {String: AnyStruct}) {
            self.verificationParams.append(params)
        }

        // latest result and times completed
        access(contract) fun updateVerificationResult(idx: Int, result: Bool) {
            pre {
                idx < self.verificationParams.length: "Update verification"
                self.verificationResults[idx] == nil: "Verification result exists"
            }
            self.verificationResults[idx] = result
            // update completed one time
            if result {
                self.timesCompleted = self.timesCompleted + 1
            }
        }
    }

    pub struct SeasonRecord {
        pub let referredFromCode: String?
        pub let referredFromAddress: Address?
        pub var referralCode: String?
        pub var points: UInt64

        access(self) let campetitionServiceCap: Capability<&{Interfaces.CompetitionServicePublic}>
        access(contract) var questScores: {String: QuestRecord}

        init(
            cap: Capability<&{Interfaces.CompetitionServicePublic}>,
            referredFrom: String?
        ) {
            self.campetitionServiceCap = cap
            self.referredFromCode = referredFrom
            self.referredFromAddress = nil // TODO: parse address from code?
            self.referralCode = nil
            self.points = 0
            self.questScores = {}
        }

        // get reference of the quest record
        access(contract) fun getQuestRecordRef(questKey: String): &QuestRecord {
            return &self.questScores[questKey] as &QuestRecord? ?? panic("Missing quest record refs.")
        }

        // update verification result
        access(contract) fun addPoints(points: UInt64) {
            self.points = self.points + points
        }

        // set the referral code
        access(contract) fun setupReferralCode(code: String) {
            pre {
                self.referralCode == nil: "referral code should be nil"
            }
            self.referralCode = code
        }
    }

    // Profile writable
    pub resource interface ProfilePrivate {
        pub fun registerForNewSeason(
            serviceCap: Capability<&{Interfaces.CompetitionServicePublic}>,
            referredFrom: String?
        )
        pub fun upsertIdentity(platform: String, identity: Interfaces.LinkedIdentity)
    }

    pub resource Profile: Interfaces.ProfilePublic, ProfilePrivate {
        access(self) var seasonScores: {UInt64: SeasonRecord}
        access(self) var linkedIdentities: {String: Interfaces.LinkedIdentity}

        init() {
            self.seasonScores = {}
            self.linkedIdentities = {}

            UserProfile.totalProfiles = UserProfile.totalProfiles + 1

            emit ProfileCreated(profileId: self.uuid)
        }

        // ---- readonly methods ----

        pub fun getIdentities(): [Interfaces.LinkedIdentity] {
            return self.linkedIdentities.values
        }

        pub fun getIdentity(platform: String): Interfaces.LinkedIdentity {
            return self.linkedIdentities[platform] ?? panic("Platform not found.")
        }

        pub fun getSeasonPoints(seasonId: UInt64): UInt64 {
            let seasonRef = self.getSeasonRecordRef(seasonId)
            return seasonRef.points
        }

        pub fun getReferredFrom(seasonId: UInt64): Address? {
            let seasonRef = self.getSeasonRecordRef(seasonId)
            return seasonRef.referredFromAddress
        }

        pub fun getTimesCompleted(seasonId: UInt64, questKey: String): UInt64 {
            let seasonRef = self.getSeasonRecordRef(seasonId)
            let questScoreRef = seasonRef.getQuestRecordRef(questKey: questKey)
            return questScoreRef.timesCompleted
        }

        pub fun getLatestSeasonQuestParameters(seasonId: UInt64, questKey: String): {String: AnyStruct} {
            let seasonRef = self.getSeasonRecordRef(seasonId)
            let questScoreRef = seasonRef.getQuestRecordRef(questKey: questKey)
            return questScoreRef.getLatestParams()
        }

        pub fun getLatestSeasonQuestIndex(seasonId: UInt64, questKey: String): Int {
            let seasonRef = self.getSeasonRecordRef(seasonId)
            let questScoreRef = seasonRef.getQuestRecordRef(questKey: questKey)
            return questScoreRef.getLatestIndex()
        }

        pub fun getLatestSeasonQuestResult(seasonId: UInt64, questKey: String): Bool? {
            let seasonRef = self.getSeasonRecordRef(seasonId)
            let questScoreRef = seasonRef.getQuestRecordRef(questKey: questKey)
            return questScoreRef.getLatestResult()
        }


        // ---- writable methods ----

        pub fun registerForNewSeason(
            serviceCap: Capability<&{Interfaces.CompetitionServicePublic}>,
            referredFrom: String?
        ) {
            let serviceRef = serviceCap.borrow() ?? panic("Failed to get service capability.")
            let competitionCap = serviceRef.getLatestActiveSeason()
            assert(competitionCap.isActive(), message: "Competition is not active.")

            // add to competition
            let profileAddress = self.owner!.address
            competitionCap.registerProfile(acct: profileAddress)

            let seasonId = competitionCap.getId()
            self.seasonScores[seasonId] = SeasonRecord(
                cap: serviceCap,
                referredFrom: referredFrom
            )

            emit ProfileSeasonNewSeason(
                profile: profileAddress,
                seasonId: seasonId,
                referredFrom: referredFrom,
            )
        }

        pub fun upsertIdentity(platform: String, identity: Interfaces.LinkedIdentity) {
            self.linkedIdentities[platform] = identity

            emit ProfileUpsertIdentity(
                profile: self.owner!.address,
                platform: platform,
                uid: identity.uid,
                name: identity.display.name,
                image: identity.display.thumbnail.uri()
            )
        }

        access(account) fun addPoints(seasonId: UInt64, points: UInt64) {
            let seasonRef = self.getSeasonRecordRef(seasonId)
            seasonRef.addPoints(points: points)

            emit ProfileSeasonAddPoints(
                profile: self.owner!.address,
                seasonId: seasonId,
                points: points,
            )
        }

        access(account) fun appendNewParams(seasonId: UInt64, questKey: String, params: {String: AnyStruct}) {
            let seasonRef = self.getSeasonRecordRef(seasonId)
            let questScoreRef = seasonRef.getQuestRecordRef(questKey: questKey)
            questScoreRef.appendNewParams(params: params)

            emit QuestRecordAppendNewParams(
                profile: self.owner!.address,
                seasonId: seasonId,
                questKey: questKey,
                keys: params.keys,
            )
        }

        // latest result and times completed
        access(account) fun updateVerificationResult(seasonId: UInt64, questKey: String, idx: Int, result: Bool) {
            let seasonRef = self.getSeasonRecordRef(seasonId)
            let questScoreRef = seasonRef.getQuestRecordRef(questKey: questKey)
            questScoreRef.updateVerificationResult(idx: idx, result: result)

            emit QuestRecordUpdateVerificationResult(
                profile: self.owner!.address,
                seasonId: seasonId,
                questKey: questKey,
                index: idx,
                result: result,
            )
        }

        access(account) fun setupReferralCode(seasonId: UInt64) {
            let code = "" // TODO

            emit QuestRecordSetupReferralCode(
                profile: self.owner!.address,
                seasonId: seasonId,
                code: code,
            )
        }

        // ---- internal methods ----

        access(self) fun getSeasonRecordRef(_ seasonId: UInt64): &SeasonRecord {
            return &self.seasonScores[seasonId] as &SeasonRecord? ?? panic("Missing season score")
        }
    }


    // ---- public methods ----

    pub fun createUserProfile(): @Profile {
        return <- create Profile()
    }

    pub fun borrowUserProfilePublic(_ acct: Address): &Profile{Interfaces.ProfilePublic} {
        return getAccount(acct)
            .getCapability<&Profile{Interfaces.ProfilePublic}>(UserProfile.ProfilePublicPath)
            .borrow() ?? panic("Failed to borrow user profile: ".concat(acct.toString()))
    }

    init() {
        self.totalProfiles = 0

        self.ProfileStoragePath = /storage/DevCompetitionProfilePathV1
        self.ProfilePublicPath = /public/DevCompetitionProfilePathV1

        emit ContractInitialized()
    }
}