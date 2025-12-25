import { describe, expect, it } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;

describe("Escrow Service Tests", () => {
  it("should create escrow successfully", () => {
    const { result } = simnet.callPublicFn(
      "escrow-service",
      "create-escrow",
      [
        Cl.principal(wallet2),
        Cl.uint(10000000),
        Cl.uint(1000),
        Cl.stringUtf8("Test escrow")
      ],
      wallet1
    );
    expect(result).toBeOk(Cl.uint(1));
  });

  it("should reject zero amount", () => {
    const { result } = simnet.callPublicFn(
      "escrow-service",
      "create-escrow",
      [
        Cl.principal(wallet2),
        Cl.uint(0),
        Cl.uint(1000),
        Cl.stringUtf8("Zero escrow")
      ],
      wallet1
    );
    expect(result).toBeErr(Cl.uint(300));
  });

  it("should prevent buyer from being seller", () => {
    const { result } = simnet.callPublicFn(
      "escrow-service",
      "create-escrow",
      [
        Cl.principal(wallet1),
        Cl.uint(10000000),
        Cl.uint(1000),
        Cl.stringUtf8("Self escrow")
      ],
      wallet1
    );
    expect(result).toBeErr(Cl.uint(301));
  });

  it("should reject zero duration", () => {
    const { result } = simnet.callPublicFn(
      "escrow-service",
      "create-escrow",
      [
        Cl.principal(wallet2),
        Cl.uint(10000000),
        Cl.uint(0),
        Cl.stringUtf8("No duration")
      ],
      wallet1
    );
    expect(result).toBeErr(Cl.uint(302));
  });

  it("should allow buyer to release escrow", () => {
    simnet.callPublicFn(
      "escrow-service",
      "create-escrow",
      [
        Cl.principal(wallet2),
        Cl.uint(10000000),
        Cl.uint(1000),
        Cl.stringUtf8("Release test")
      ],
      wallet1
    );

    const { result } = simnet.callPublicFn(
      "escrow-service",
      "release-escrow",
      [Cl.uint(1)],
      wallet1
    );
    expect(result).toBeOk(Cl.bool(true));
  });

  it("should prevent non-buyer from releasing", () => {
    simnet.callPublicFn(
      "escrow-service",
      "create-escrow",
      [
        Cl.principal(wallet2),
        Cl.uint(10000000),
        Cl.uint(1000),
        Cl.stringUtf8("Auth test")
      ],
      wallet1
    );

    const { result } = simnet.callPublicFn(
      "escrow-service",
      "release-escrow",
      [Cl.uint(1)],
      wallet2
    );
    expect(result).toBeErr(Cl.uint(304));
  });

  it("should allow refund after expiry", () => {
    simnet.callPublicFn(
      "escrow-service",
      "create-escrow",
      [
        Cl.principal(wallet2),
        Cl.uint(10000000),
        Cl.uint(5),
        Cl.stringUtf8("Refund test")
      ],
      wallet1
    );

    // Mine blocks to pass expiry
    simnet.mineEmptyBlocks(6);

    const { result } = simnet.callPublicFn(
      "escrow-service",
      "refund-escrow",
      [Cl.uint(1)],
      wallet1
    );
    expect(result).toBeOk(Cl.bool(true));
  });

  it("should prevent refund before expiry", () => {
    simnet.callPublicFn(
      "escrow-service",
      "create-escrow",
      [
        Cl.principal(wallet2),
        Cl.uint(10000000),
        Cl.uint(1000),
        Cl.stringUtf8("Early refund test")
      ],
      wallet1
    );

    const { result } = simnet.callPublicFn(
      "escrow-service",
      "refund-escrow",
      [Cl.uint(1)],
      wallet1
    );
    expect(result).toBeErr(Cl.uint(307));
  });
});
