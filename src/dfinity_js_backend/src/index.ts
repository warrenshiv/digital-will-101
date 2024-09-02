import {
  query,
  update,
  text,
  Record,
  StableBTreeMap,
  Result,
  Err,
  Ok,
  nat64,
  bool,
  Vec,
  Null,
  Canister,
  ic,
  Opt,
} from "azle";
import { v4 as uuidv4 } from "uuid";

// Define the User struct
const User = Record({
  id: text,
  name: text,
  email: text,
  createdAt: nat64,
});

// Define the Asset struct
const Asset = Record({
  id: text,
  willId: text,
  name: text,
  value: nat64,
  createdAt: nat64,
});

// Define the Beneficiary struct
const Beneficiary = Record({
  id: text,
  willId: text,
  name: text,
  share: nat64,
  createdAt: nat64,
});

// Define the Will struct
const Will = Record({
  id: text,
  userId: text,
  executorId: text,
  assets: Vec(Asset),
  beneficiaries: Vec(Beneficiary),
  createdAt: nat64,
  isExecuted: bool,
});

// Define the Executor struct
const Executor = Record({
  id: text,
  name: text,
  contact: text,
  createdAt: nat64,
});

// Payloads for creating and managing users
const UserPayload = Record({
  name: text,
  email: text,
});

// Payloads for creating and managing wills
const WillPayload = Record({
  userId: text,
  executorId: text,
});

// Asset Payload
const AssetPayload = Record({
  willId: text,
  name: text,
  value: nat64,
});

// Beneficiary Payload
const BeneficiaryPayload = Record({
  willId: text,
  name: text,
  share: nat64,
});

// Executor Payload
const ExecutorPayload = Record({
  name: text,
  contact: text,
});

// AssignExecutor Payload
const AssignExecutorPayload = Record({
  willId: text,
  executorId: text,
});

// Initialize stable maps for storing data
const usersStorage = StableBTreeMap(0, text, User);
const willsStorage = StableBTreeMap(1, text, Will);
const executorsStorage = StableBTreeMap(2, text, Executor);
const assetsStorage = StableBTreeMap(3, text, Asset);
const beneficiariesStorage = StableBTreeMap(4, text, Beneficiary);

// Canister Definition
export default Canister({
  // Create a new user
  createUser: update([UserPayload], Result(User, text), (payload) => {
    if (!payload.name || !payload.email) {
      return Err("Name and email are required.");
    }

    const id = uuidv4();
    const user = {
      id,
      name: payload.name,
      email: payload.email,
      createdAt: ic.time(),
    };

    usersStorage.insert(id, user);
    return Ok(user);
  }),

  // Create a new executor
  createExecutor: update(
    [ExecutorPayload],
    Result(Executor, text),
    (payload) => {
      if (!payload.name || !payload.contact) {
        return Err("Name and contact are required.");
      }

      const id = uuidv4();
      const executor = {
        id,
        name: payload.name,
        contact: payload.contact,
        createdAt: ic.time(),
      };

      executorsStorage.insert(id, executor);
      return Ok(executor);
    }
  ),

  // Create a new will
  createWill: update([WillPayload], Result(Will, text), (payload) => {
    const userOpt = usersStorage.get(payload.userId);
    if ("None" in userOpt) {
      return Err("User not found.");
    }

    const executorOpt = executorsStorage.get(payload.executorId);
    if ("None" in executorOpt) {
      return Err("Executor not found.");
    }

    const id = uuidv4();
    const will = {
      id,
      userId: payload.userId,
      executorId: payload.executorId,
      assets: [],
      beneficiaries: [],
      createdAt: ic.time(),
      isExecuted: false,
    };

    willsStorage.insert(id, will);
    return Ok(will);
  }),

  // Add an asset to a will
  addAsset: update([AssetPayload], Result(Null, text), (payload) => {
    const willOpt = willsStorage.get(payload.willId);
    if ("None" in willOpt) {
      return Err("Will not found.");
    }

    const will = willOpt.Some;

    const assetId = uuidv4();
    const asset = {
      id: assetId,
      willId: payload.willId,
      name: payload.name,
      value: payload.value,
      createdAt: ic.time(),
    };

    will.assets.push(asset);
    willsStorage.insert(payload.willId, will);
    assetsStorage.insert(assetId, asset);
    return Ok(null);
  }),

  // Add a beneficiary to a will
  addBeneficiary: update(
    [BeneficiaryPayload],
    Result(Null, text),
    (payload) => {
      const willOpt = willsStorage.get(payload.willId);
      if ("None" in willOpt) {
        return Err("Will not found.");
      }

      const will = willOpt.Some;

      const beneficiaryId = uuidv4();
      const beneficiary = {
        id: beneficiaryId,
        willId: payload.willId,
        name: payload.name,
        share: payload.share,
        createdAt: ic.time(),
      };

      will.beneficiaries.push(beneficiary);
      willsStorage.insert(payload.willId, will);
      beneficiariesStorage.insert(beneficiaryId, beneficiary);
      return Ok(null);
    }
  ),

  // Assign an executor to a will
  assignExecutor: update(
    [AssignExecutorPayload],
    Result(Null, text),
    (payload) => {
      const willOpt = willsStorage.get(payload.willId);
      if ("None" in willOpt) {
        return Err("Will not found.");
      }

      const will = willOpt.Some;

      const executorOpt = executorsStorage.get(payload.executorId);
      if ("None" in executorOpt) {
        return Err("Executor not found.");
      }

      will.executorId = payload.executorId;
      willsStorage.insert(payload.willId, will);
      return Ok(null);
    }
  ),

  // Get a user by ID
  getUser: query([text], Result(User, text), (userId) => {
    const userOpt = usersStorage.get(userId);
    if ("None" in userOpt) {
      return Err("User not found.");
    }
    return Ok(userOpt.Some);
  }),

  // Get all users
  getAllUsers: query([], Result(Vec(User), text), () => {
    const users = usersStorage.values();
    if (users.length === 0) {
      return Err("No users found.");
    }
    return Ok(users);
  }),

  // Get an executor by ID
  getExecutor: query([text], Result(Executor, text), (executorId) => {
    const executorOpt = executorsStorage.get(executorId);
    if ("None" in executorOpt) {
      return Err("Executor not found.");
    }
    return Ok(executorOpt.Some);
  }),

  // Get all executors
  getAllExecutors: query([], Result(Vec(Executor), text), () => {
    const executors = executorsStorage.values();
    if (executors.length === 0) {
      return Err("No executors found.");
    }
    return Ok(executors);
  }),

  // Get a will by ID
  getWill: query([text], Result(Will, text), (willId) => {
    const willOpt = willsStorage.get(willId);
    if ("None" in willOpt) {
      return Err("Will not found.");
    }
    return Ok(willOpt.Some);
  }),

  // Get all wills
  getAllWills: query([], Result(Vec(Will), text), () => {
    const wills = willsStorage.values();
    if (wills.length === 0) {
      return Err("No wills found.");
    }
    return Ok(wills);
  }),
});
