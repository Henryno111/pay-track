import { describe, expect, it } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;

describe("User Registry Tests", () => {
  it("should allow user registration", () => {
    const { result } = simnet.callPublicFn(
      "user-registry",
      "register-user",
      [Cl.stringAscii("alice")],
      wallet1
    );
    expect(result).toBeOk(Cl.bool(true));
  });

  it("should prevent duplicate registration", () => {
    simnet.callPublicFn(
      "user-registry",
      "register-user",
      [Cl.stringAscii("alice")],
      wallet1
    );
    
    const { result } = simnet.callPublicFn(
      "user-registry",
      "register-user",
      [Cl.stringAscii("alice2")],
      wallet1
    );
    expect(result).toBeErr(Cl.uint(100));
  });

  it("should reject empty username", () => {
    const { result } = simnet.callPublicFn(
      "user-registry",
      "register-user",
      [Cl.stringAscii("")],
      wallet1
    );
    expect(result).toBeErr(Cl.uint(101));
  });

  it("should increment total users", () => {
    simnet.callPublicFn(
      "user-registry",
      "register-user",
      [Cl.stringAscii("alice")],
      wallet1
    );

    const { result } = simnet.callReadOnlyFn(
      "user-registry",
      "get-total-users",
      [],
      wallet1
    );
    expect(result).toBeOk(Cl.uint(1));
  });

  it("should allow owner to verify KYC", () => {
    simnet.callPublicFn(
      "user-registry",
      "register-user",
      [Cl.stringAscii("alice")],
      wallet1
    );

    const { result } = simnet.callPublicFn(
      "user-registry",
      "verify-kyc",
      [Cl.principal(wallet1)],
      deployer
    );
    expect(result).toBeOk(Cl.bool(true));
  });

  it("should prevent non-owner from verifying KYC", () => {
    simnet.callPublicFn(
      "user-registry",
      "register-user",
      [Cl.stringAscii("alice")],
      wallet1
    );

    const { result } = simnet.callPublicFn(
      "user-registry",
      "verify-kyc",
      [Cl.principal(wallet1)],
      wallet2
    );
    expect(result).toBeErr(Cl.uint(103));
  });
});
