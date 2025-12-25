import { describe, expect, it, beforeEach } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;
const wallet3 = accounts.get("wallet_3")!;

describe("Payment Splitter Contract Tests", () => {
  beforeEach(() => {
    simnet.setEpoch("3.0");
  });

  it("should create a split successfully", () => {
    const { result } = simnet.callPublicFn(
      "payment-splitter",
      "create-split",
      [Cl.stringAscii("Team payment split")],
      deployer
    );

    expect(result).toBeOk(Cl.uint(1));
  });

  it("should get split details", () => {
    simnet.callPublicFn(
      "payment-splitter",
      "create-split",
      [Cl.stringAscii("Revenue sharing")],
      deployer
    );

    const { result } = simnet.callReadOnlyFn(
      "payment-splitter",
      "get-split",
      [Cl.uint(1)],
      deployer
    );

    expect(result).toBeSome(
      Cl.tuple({
        creator: Cl.principal(deployer),
        description: Cl.stringAscii("Revenue sharing"),
        "created-at": Cl.uint(simnet.blockHeight),
      })
    );
  });

  it("should execute split payment with 2 recipients", () => {
    const amount = 1000000;
    const recipients = Cl.list([
      Cl.tuple({
        recipient: Cl.principal(wallet1),
        percentage: Cl.uint(6000),
      }),
      Cl.tuple({
        recipient: Cl.principal(wallet2),
        percentage: Cl.uint(4000),
      }),
    ]);

    const { result } = simnet.callPublicFn(
      "payment-splitter",
      "execute-split-list",
      [Cl.uint(amount), recipients],
      deployer
    );

    expect(result).toBeOk(Cl.bool(true));
  });

  it("should execute split payment with 3 recipients", () => {
    const amount = 3000000;
    const recipients = Cl.list([
      Cl.tuple({
        recipient: Cl.principal(wallet1),
        percentage: Cl.uint(5000),
      }),
      Cl.tuple({
        recipient: Cl.principal(wallet2),
        percentage: Cl.uint(3000),
      }),
      Cl.tuple({
        recipient: Cl.principal(wallet3),
        percentage: Cl.uint(2000),
      }),
    ]);

    const { result } = simnet.callPublicFn(
      "payment-splitter",
      "execute-split-list",
      [Cl.uint(amount), recipients],
      deployer
    );

    expect(result).toBeOk(Cl.bool(true));
  });
});
