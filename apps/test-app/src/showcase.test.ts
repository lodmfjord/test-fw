import { describe, expect, it } from "bun:test";
import { testAppFetch } from "./dev-app";
import { testAppContract } from "./test-app-contract";

describe("test-app showcase", () => {
  it("runs endpoints as one dev app", async () => {
    const healthResponse = await testAppFetch(
      new Request("http://local/health", { method: "GET" }),
    );
    expect(healthResponse.status).toBe(200);
    expect((await healthResponse.json()) as { status?: string }).toEqual({ status: "ok" });

    const helloWorldResponse = await testAppFetch(
      new Request("http://local/hello_world", { method: "GET" }),
    );
    expect(helloWorldResponse.status).toBe(200);
    expect((await helloWorldResponse.json()) as { hello?: string }).toEqual({
      hello: "hello-world-from-package",
    });

    const createUserResponse = await testAppFetch(
      new Request("http://local/users", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ name: "sam" }),
      }),
    );

    expect(createUserResponse.status).toBe(200);
    expect(
      (await createUserResponse.json()) as {
        id?: string;
      },
    ).toEqual({
      id: "user-sam",
    });

    const getTestDbOneResponse = await testAppFetch(
      new Request("http://local/test-db-one/alpha", { method: "GET" }),
    );
    expect(getTestDbOneResponse.status).toBe(200);
    expect(
      (await getTestDbOneResponse.json()) as {
        id?: string;
        name?: string;
        points?: number;
      },
    ).toEqual({
      id: "alpha",
      name: "test-db-one-alpha",
      points: 0,
    });

    const patchTestDbOneResponse = await testAppFetch(
      new Request("http://local/test-db-one/alpha", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          name: "test-db-one-alpha-updated",
          points: 10,
        }),
      }),
    );
    expect(patchTestDbOneResponse.status).toBe(200);
    expect(
      (await patchTestDbOneResponse.json()) as {
        id?: string;
        name?: string;
        points?: number;
      },
    ).toEqual({
      id: "alpha",
      name: "test-db-one-alpha-updated",
      points: 10,
    });

    const getTestDbTwoResponse = await testAppFetch(
      new Request("http://local/test-db-two/bravo", { method: "GET" }),
    );
    expect(getTestDbTwoResponse.status).toBe(200);
    expect(
      (await getTestDbTwoResponse.json()) as {
        enabled?: boolean;
        id?: string;
        title?: string;
      },
    ).toEqual({
      enabled: false,
      id: "bravo",
      title: "test-db-two-bravo",
    });

    const patchTestDbTwoResponse = await testAppFetch(
      new Request("http://local/test-db-two/bravo", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          enabled: true,
          title: "test-db-two-bravo-updated",
        }),
      }),
    );
    expect(patchTestDbTwoResponse.status).toBe(200);
    expect(
      (await patchTestDbTwoResponse.json()) as {
        enabled?: boolean;
        id?: string;
        title?: string;
      },
    ).toEqual({
      enabled: true,
      id: "bravo",
      title: "test-db-two-bravo-updated",
    });
  });

  it("compiles endpoints into many lambda entries for prod", () => {
    const functionIds = testAppContract.lambdasManifest.functions.map(
      (lambdaFunction) => lambdaFunction.functionId,
    );

    expect(functionIds).toEqual([
      "get_health",
      "get_hello_world",
      "post_users",
      "get_test_db_one_param_id",
      "patch_test_db_one_param_id",
      "get_test_db_two_param_id",
      "patch_test_db_two_param_id",
    ]);
  });
});
