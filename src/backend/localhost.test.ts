test("/posts/all", async () => {
  const response = await fetch("http://localhost:3001/posts/all");
  expect(response.ok).toBeTruthy();
});
test("update fail /posts", async () => {
  const new_resp = await fetch("http://localhost:3001/posts/new", {
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
    body: JSON.stringify({
      title: "test2",
      excerpt: "test excerpt2",
      date: "2025-01-01",
      postBody: "# Hello World2",
    }),
  });
  expect(new_resp.ok).toBeTruthy();
  const new_json = await new_resp.json();
  expect(new_json.errors).toBeFalsy();
  expect(new_json._id).toBeDefined();

  const up_resp = await fetch("http://localhost:3001/posts/" + new_json._id, {
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
    body: JSON.stringify({
      _id: new_json._id,
    }),
  });
  expect(up_resp.ok).toBeTruthy();
  const up_json = await up_resp.json();
  expect(up_json.errors).toHaveLength(1);
  expect(up_json.errors[0]).toEqual(
    expect.stringContaining("nothing to update")
  );

  const del_resp = await fetch(
    "http://localhost:3001/posts/delete/" + new_json._id
  );
  expect(del_resp.ok).toBeTruthy();
});
test("/posts/new", async () => {
  const new_resp = await fetch("http://localhost:3001/posts/new", {
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
    body: JSON.stringify({
      title: "test",
      excerpt: "test excerpt",
      date: "2025-01-01",
      postBody: "# Hello World",
    }),
  });
  expect(new_resp.ok).toBeTruthy();
  const new_json = await new_resp.json();
  expect(new_json.errors).toBeFalsy();
  expect(new_json._id).toBeDefined();

  const get_resp = await fetch("http://localhost:3001/posts/" + new_json._id);
  expect(get_resp.ok).toBeTruthy();
  const get_json = await get_resp.json();
  expect(get_json.errors).toBeFalsy();
  expect(get_json._id).toEqual(new_json._id);
  expect(get_json.title).toEqual("test");

  const up_resp = await fetch("http://localhost:3001/posts/" + new_json._id, {
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
    body: JSON.stringify({
      _id: new_json._id,
      title: "Bye World",
    }),
  });
  expect(up_resp.ok).toBeTruthy();
  const up_json = await up_resp.json();
  expect(up_json.errors).toBeFalsy();
  expect(up_json._id).toEqual(new_json._id);

  const get_resp2 = await fetch("http://localhost:3001/posts/" + new_json._id);
  expect(get_resp2.ok).toBeTruthy();
  const get_json2 = await get_resp2.json();
  expect(get_json2.errors).toBeFalsy();
  expect(get_json2._id).toEqual(new_json._id);
  expect(get_json2.title).toEqual("Bye World");

  const del_resp = await fetch(
    "http://localhost:3001/posts/delete/" + new_json._id
  );
  expect(del_resp.ok).toBeTruthy();
  const del_json = await del_resp.json();
  expect(del_json.errors).toBeFalsy();
  expect(del_json.deletedCount).toEqual(1);
});
