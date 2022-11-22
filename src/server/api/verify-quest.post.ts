import * as fcl from "@onflow/fcl";
import { z, useValidatedBody } from "h3-zod";
import { flow, assert, Signer } from "../helpers";

export default defineEventHandler(async function (event) {
  const config = useRuntimeConfig();

  // Step.0 verify body parameters
  const body = await useValidatedBody(
    event,
    z.object({
      address: z.string(), // required, mainnet address
      proofNonce: z.string(), // required, mainnet account proof nonce
      proofSigs: z.array(
        // required, proof signatures
        z.object({
          keyId: z.number(),
          addr: z.string(),
          signature: z.string(),
        })
      ),
      questKey: z.string(), // required, quest id
      questAddr: z.string(), // required, quest related
    })
  );

  console.log(`Request[${body.address}] - Step.0: Body verified`);

  const isProduction = config.public.network === "mainnet";

  const signer = new Signer(config.flowAdminAddress, config.flowPrivateKey, 0, {
    Interfaces: config.flowServiceAddress,
    UserProfile: config.flowServiceAddress,
    CompetitionService: config.flowServiceAddress,
  });

  // Step.1 Verify account proof on mainnet
  if (isProduction) {
    flow.switchToMainnet();
  } else {
    flow.switchToTestnet();
  }

  const isValid = await fcl.AppUtils.verifyAccountProof(
    flow.APP_IDENTIFIER,
    {
      address: body.address,
      nonce: body.proofNonce,
      signatures: body.proofSigs.map((one) => ({
        f_type: "CompositeSignature",
        f_vsn: "1.0.0",
        keyId: one.keyId,
        addr: one.addr,
        signature: one.signature,
      })),
    },
    {
      // use blocto adddres to avoid self-custodian
      // https://docs.blocto.app/blocto-sdk/javascript-sdk/flow/account-proof
      fclCryptoContract: isProduction
        ? "0xdb6b70764af4ff68"
        : "0x5b250a8a85b44a67",
    }
  );
  assert(isValid, "account proof invalid");
  console.log(`Request[${body.address}] - Step.1: Signature verified`);

  // Step.2 Verify the quest result on testnet
  if (isProduction) {
    flow.switchToTestnet();
  } else {
    flow.switchToEmulator();
  }
  // run a script to ensure transactions
  const isQuestValid = await flow.scVerifyQuest(signer, body.questKey, {
    acct: body.questAddr,
  });
  console.log(
    `Request[${body.address}] - Step.2: Quest verification: ${isQuestValid}`
  );

  // Step.3 Run a transaction on mainnet
  if (isProduction) {
    flow.switchToMainnet();
  } else {
    flow.switchToTestnet();
  }
  let transactionId: string | null = null;
  if (isQuestValid) {
    // run the reward transaction
    transactionId = await flow.txCtrlerSetQuestCompleted(signer, {
      target: body.address,
      questKey: body.questKey,
    });
  } else {
    transactionId = await flow.txCtrlerSetQuestFailure(signer, {
      target: body.address,
      questKey: body.questKey,
    });
  }

  if (transactionId) {
    console.log(
      `Request[${body.address}] - Step.3: Transaction Sent: ${transactionId}`
    );
  }

  // Step.4 Return the transaction id
  return { isQuestValid, ok: transactionId !== null, transactionId };
});
