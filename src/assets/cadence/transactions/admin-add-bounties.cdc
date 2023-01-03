import Interfaces from "../../../../cadence/dev-challenge/Interfaces.cdc"
import UserProfile from "../../../../cadence/dev-challenge/UserProfile.cdc"
import Community from "../../../../cadence/dev-challenge/Community.cdc"
import CompetitionService from "../../../../cadence/dev-challenge/CompetitionService.cdc"
import Helper from "../../../../cadence/dev-challenge/Helper.cdc"

transaction(
    communityKey: String,
    keys: [String],
    categories: [UInt8],
    rewardPoints: [UInt64],
    referralPoints: [UInt64],
    primary: [Bool],
) {
    let admin: &CompetitionService.CompetitionAdmin

    prepare(acct: AuthAccount) {
        self.admin = acct.borrow<&CompetitionService.CompetitionAdmin>(from: CompetitionService.AdminStoragePath)
            ?? panic("Without admin resource")
    }

    pre {
        keys.length == categories.length: "Miss match"
        keys.length == rewardPoints.length: "Miss match"
        keys.length == referralPoints.length: "Miss match"
        keys.length == primary.length: "Miss match"
    }

    execute {
        let comPubRef= Community.borrowCommunityByKey(key: communityKey)
        assert(comPubRef != nil, message: "Failed to get community".concat(communityKey))
        let communityId = comPubRef!.getID()

        let service = CompetitionService.borrowServicePublic()
        let seasonId = service.getActiveSeasonID()
        let season = service.borrowSeason(seasonId: seasonId)

        let len = keys.length
        var i = 0
        while i < len {
            let entityIdentifier = Community.BountyEntityIdentifier(
                category: Interfaces.BountyType(rawValue: categories[i]) ?? panic("Wrong category value"),
                communityId: communityId,
                key: keys[i]
            )
            if !season.hasBountyByKey(keys[i]) {
                // ensure exists
                entityIdentifier.getBountyEntity()

                self.admin.addBounty(
                    seasonId: season.getSeasonId(),
                    identifier: entityIdentifier,
                    preconditions: [], // FIXME: no precondition for now
                    reward: Helper.PointReward(rewardPoints[i], referralPoints[i]),
                    primary: primary[i],
                )
            }
            i = i + 1
        }
    }
}