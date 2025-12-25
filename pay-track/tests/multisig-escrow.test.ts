import { describe, expect, it, beforeEach } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const buyer = accounts.get("wallet_1")!;
const seller = accounts.get("wallet_2")!;
const signer1 = accounts.get("wallet_3")!;
const signer2 = accounts.get("wallet_4")!;

describe("Multi-Sig Escrow Contract Tests", () => {
  beforeEach(() => {
    simnet.setEpoch("3.0");
  });

  it("should create a 2-of-2 escrow", () => {
    const { result } = simnet.callPublicFn(
      "multisig-escrow",
      "create-escrow",
      [
        Cl.principal(seller),
        Cl.uint(1000000), // 1 STX
        Cl.uint(100), // 100 blocks duration
        Cl.uint(2), // Requires 2 signatures
      ],
      buyer
    );

    expect(result).toBeOk(Cl.uint(1));
  });

  it("should get escrow details", () => {
    // Create escrow
    simnet.callPublicFn(
      "multisig-escrow",
      "create-escrow",
      [
        Cl.principal(seller),
        Cl.uint(500000),
        Cl.uint(200),
        Cl.uint(2),
      ],
      buyer
    );

    // Get escrow
    const { result } = simnet.callReadOnlyFn(
      "multisig-escrow",
      "get-escrow",
      [Cl.uint(1)],
      deployer
    );

    expect(result).toBeSome(
      Cl.tuple({
        buyer: Cl.principal(buyer),
        seller: Cl.principal(seller),
        amount: Cl.uint(500000),
        "required-sigs": Cl.uint(2),
        "release-sigs": Cl.uint(0),
        "refund-sigs": Cl.uint(0),
        "expires-at": Cl.uint(simnet.blockHeight + 200),
        status: Cl.stringAscii("pending"),
      })
    );
  });

  it("should sign release and collect signatures", () => {
    // Create escrow
    simnet.callPublicFn(
      "multisig-escrow",
      "create-escrow",
      [
        Cl.principal(seller),
        Cl.uint(1000000),
        Cl.uint(100),
        Cl.uint(2),
      ],
      buyer
    );

    // Buyer signs release
    const { result: sign1 } = simnet.callPublicFn(
      "multisig-escrow",
      "sign-release",
      [Cl.uint(1)],
      buyer
    );

    expect(sign1).toBeOk(Cl.bool(true));

    // Seller signs release (should execute)
    const { result: sign2 } = simnet.callPublicFn(
      "multisig-escrow",
      "sign-release",
      [Cl.uint(1)],
      seller
    );

    expect(sign2).toBeOk(Cl.bool(true));

    // Check status
    const escrow = simnet.callReadOnlyFn(
      "multisig-escrow",
      "get-escrow",
      [Cl.uint(1)],
      deployer
    );

    expect(escrow.result).toBeSome(
      Cl.tuple({
        buyer: Cl.principal(buyer),
        seller: Cl.principal(seller),
        amount: Cl.uint(1000000),
        "required-sigs": Cl.uint(2),
        "release-sigs": Cl.uint(2),
        "refund-sigs": Cl.uint(0),
        "expires-at": Cl.uint(simnet.blockHeight + 99),
        status: Cl.stringAscii("released"),
      })
    );
  });

  it("should fail to sign release twice", () => {
    // Create escrow
    simnet.callPublicFn(
      "multisig-escrow",
      "create-escrow",
      [Cl.principal(seller), Cl.uint(1000000), Cl.uint(100), Cl.uint(2)],
      buyer
    );

    // Buyer signs release
    simnet.callPublicFn(
      "multisig-escrow",
      "sign-release",
      [Cl.uint(1)],
      buyer
    );

    // Try to sign again
    const { result } = simnet.callPublicFn(
      "multisig-escrow",
      "sign-release",
      [Cl.uint(1)],
      buyer
    );

    expect(result).toBeErr(Cl.uint(603)); // err-already-signed
  });

  it("should sign refund and execute with enough signatures", () => {
    // Create escrow
    simnet.callPublicFn(
      "multisig-escrow",
      "create-escrow",
      [Cl.principal(seller), Cl.uint(1000000), Cl.uint(100), Cl.uint(2)],
      buyer
    );

    // Buyer signs refund
    simnet.callPublicFn(
      "multisig-escrow",
      "sign-refund",
      [Cl.uint(1)],
      buyer
    );

    // Seller signs refund
    const { result } = simnet.callPublicFn(
      "multisig-escrow",
      "sign-refund",
      [Cl.uint(1)],
      seller
    );

    expect(result).toBeOk(Cl.bool(true));

    // Check status
    const escrow = simnet.callReadOnlyFn(
      "multisig-escrow",
      "get-escrow",
      [Cl.uint(1)],
      deployer
    );

    expect(escrow.result).toBeSome(
      Cl.tuple({
        buyer: Cl.principal(buyer),
        seller: Cl.principal(seller),
        amount: Cl.uint(1000000),
        "required-sigs": Cl.uint(2),
        "release-sigs": Cl.uint(0),
        "refund-sigs": Cl.uint(2),
        "expires-at": Cl.uint(simnet.blockHeight + 99),
        status: Cl.stringAscii("refunded"),
      })
    );
  });

  it("should track signature status", () => {
    // Create escrow
    simnet.callPublicFn(
      "multisig-escrow",
      "create-escrow",
      [Cl.principal(seller), Cl.uint(1000000), Cl.uint(100), Cl.uint(2)],
      buyer
    );

    // Buyer signs release
    simnet.callPublicFn(
      "multisig-escrow",
      "sign-release",
      [Cl.uint(1)],
      buyer
    );

    // Check buyer's signature
    const { result } = simnet.callReadOnlyFn(
      "multisig-escrow",
      "get-signature",
      [Cl.uint(1), Cl.principal(buyer)],
      deployer
    );

    expect(result).toBeSome(
      Cl.tuple({
        "signed-release": Cl.bool(true),
        "signed-refund": Cl.bool(false),
      })
    );
  });

  it("should require enough signatures before execution", () => {
    // Create 3-of-3 escrow
    simnet.callPublicFn(
      "multisig-escrow",
      "create-escrow",
      [Cl.principal(seller), Cl.uint(1000000), Cl.uint(100), Cl.uint(3)],
      buyer
    );

    // Only buyer signs
    simnet.callPublicFn(
      "multisig-escrow",
      "sign-release",
      [Cl.uint(1)],
      buyer
    );

    // Check status (should still be pending)
    const escrow = simnet.callReadOnlyFn(
      "multisig-escrow",
      "get-escrow",
      [Cl.uint(1)],
      deployer
    );

    expect(escrow.result).toBeSome(
      Cl.tuple({
        buyer: Cl.principal(buyer),
        seller: Cl.principal(seller),
        amount: Cl.uint(1000000),
        "required-sigs": Cl.uint(3),
        "release-sigs": Cl.uint(1),
        "refund-sigs": Cl.uint(0),
        "expires-at": Cl.uint(simnet.blockHeight + 99),
        status: Cl.stringAscii("pending"),
      })
    );
  });
});
