// import Interfaces from "../Interfaces.cdc"
// import UserProfile from "../UserProfile.cdc"
import CompetitionService from "../CompetitionService.cdc"

transaction(
    endDate: UFix64,
) {
    let admin: &CompetitionService.CompetitionAdmin

    prepare(acct: AuthAccount) {
        self.admin = acct.borrow<&CompetitionService.CompetitionAdmin>(from: CompetitionService.AdminStoragePath)
            ?? panic("Without admin resource")
    }

    execute {
        let seasonId = CompetitionService.borrowServicePublic().getActiveSeasonID()
        self.admin.updateEndDate(seasonId: seasonId, datetime: endDate)
    }
}
