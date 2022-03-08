// Copyright (c) 2012-2018 The Elastos Open Source Project
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import BigNumber from "bignumber.js";
import { ByteStream } from "../common/bytestream";
import { Error, ErrorChecker } from "../common/ErrorChecker";
import { Log } from "../common/Log";
import { INT32_MAX, json, JSONArray, size_t, time_t, uint256, uint32_t, uint64_t, uint8_t } from "../types";
import { SHA256 } from "../walletcore/sha256";
import { Attribute } from "./Attribute";
import { CoinBase } from "./payload/CoinBase";
import { Payload } from "./payload/Payload";
import { Program } from "./Program";
import { TransactionInput } from "./TransactionInput";
import { TransactionOutput } from "./TransactionOutput";

export enum TransactionType {
	coinBase = 0x00,
	registerAsset = 0x01,
	transferAsset = 0x02,
	record = 0x03,
	deploy = 0x04,
	sideChainPow = 0x05,
	rechargeToSideChain = 0x06,
	withdrawFromSideChain = 0x07,
	transferCrossChainAsset = 0x08,

	registerProducer = 0x09,
	cancelProducer = 0x0a,
	updateProducer = 0x0b,
	returnDepositCoin = 0x0c,
	activateProducer = 0x0d,

	IllegalProposalEvidence = 0x0e,
	IllegalVoteEvidence = 0x0f,
	IllegalBlockEvidence = 0x10,
	IllegalSidechainEvidence = 0x11,
	InactiveArbitrators = 0x12,
	UpdateVersion = 0x13,
	nextTurnDPOSInfo = 0x14,

	registerCR = 0x21,
	unregisterCR = 0x22,
	updateCR = 0x23,
	returnCRDepositCoin = 0x24,

	crcProposal = 0x25,
	crcProposalReview = 0x26,
	crcProposalTracking = 0x27,
	crcAppropriation = 0x28,
	crcProposalWithdraw = 0x29,
	crcProposalRealWithdraw = 0x2a,
	crcAssetsRectify = 0x2b,
	crCouncilMemberClaimNode = 0x31,

	TypeMaxCount
}

export enum TxVersion {
	Default = 0x00,
	V09 = 0x09,
}

// TODO: remove all those Ptr
//type WalletPtr = Wallet;
type OutputArray = TransactionOutput[];
type InputArray = TransactionInput[];
type ProgramArray = Program[];
type AttributeArray = Attribute[];

const DEFAULT_PAYLOAD_TYPE = TransactionType.transferAsset;
const TX_LOCKTIME = 0x00000000;
const TX_UNCONFIRMED = INT32_MAX;   // block height indicating transaction is unconfirmed

export class Transaction {
	protected _isRegistered: boolean;
	protected _txHash: uint256;

	protected _version: uint8_t;
	protected _lockTime: uint32_t;
	protected _blockHeight: uint32_t;
	protected _timestamp: time_t; // time interval since unix epoch
	protected _type: uint8_t;
	protected _payloadVersion: uint8_t;
	protected _fee: uint64_t;
	protected _payload: Payload;
	protected _outputs: OutputArray;
	protected _inputs: InputArray;
	protected _attributes: AttributeArray;
	protected _programs: ProgramArray;

	/* Transaction::Transaction() :
			_version(TxVersion::Default),
			_lockTime(TX_LOCKTIME),
			_blockHeight(TX_UNCONFIRMED),
			_payloadVersion(0),
			_fee(0),
			_payload(nullptr),
			_type(DEFAULT_PAYLOAD_TYPE),
			_isRegistered(false),
			_txHash(0),
			_timestamp(0) {
		_payload = InitPayload(_type);
	}*/

	public static newFromParams(type: uint8_t, payload: Payload): Transaction {
		let tx = new Transaction();
		tx._version = TxVersion.Default;
		tx._lockTime = TX_LOCKTIME,
			tx._blockHeight = TX_UNCONFIRMED,
			tx._payloadVersion = 0,
			tx._fee = 0,
			tx._type = type,
			tx._isRegistered = false,
			tx._txHash = new BigNumber(0),
			tx._timestamp = 0,
			tx._payload = payload; // WAS std::move(payload)

		return tx;
	}

	/*	Transaction::Transaction(const Transaction &tx) {
			this->operator=(tx);
		} */

	public static newFromTransaction(orig: Transaction): Transaction {
		let transaction = new Transaction();

		transaction._isRegistered = orig._isRegistered;
		transaction._txHash = orig.GetHash();

		transaction._version = orig._version;
		transaction._lockTime = orig._lockTime;
		transaction._blockHeight = orig._blockHeight;
		transaction._timestamp = orig._timestamp;

		transaction._type = orig._type;
		transaction._payloadVersion = orig._payloadVersion;
		transaction._fee = orig._fee;

		transaction._payload = transaction.InitPayload(orig._type);

		transaction._payload = orig._payload;

		transaction._inputs = [];
		for (let input of orig._inputs) {
			transaction._inputs.push(TransactionInput.newFromTransactionInput(input));
		}

		transaction._outputs = [];
		for (let output of orig._outputs) {
			transaction._outputs.push(TransactionOutput.newFromTransactionOutput(output));
		}

		transaction._attributes = [];
		for (let attr of orig._attributes) {
			transaction._attributes.push(Attribute.newFromAttribute(attr));
		}

		transaction._programs = [];
		for (let program of orig._programs) {
			transaction._programs.push(Program.newFromProgram(program));
		}

		return transaction;
	}

	/*	bool Transaction::operator==(const Transaction &tx) const {
			bool equal = _version == tx._version &&
						 _lockTime == tx._lockTime &&
						 _blockHeight == tx._blockHeight &&
						 _timestamp == tx._timestamp &&
						 _type == tx._type &&
						 _payloadVersion == tx._payloadVersion &&
						 _outputs.size() == tx._outputs.size() &&
						 _inputs.size() == tx._inputs.size() &&
						 _attributes.size() == tx._attributes.size() &&
						 _programs.size() == tx._programs.size();

			if (equal)
				equal = _payload->Equal(*tx._payload, _payloadVersion);

			if (equal)
				for (int i = 0; i < _outputs.size(); ++i)
					if (*_outputs[i] != *tx._outputs[i]) {
						equal = false;
						break;
					}

			if (equal)
				for (int i = 0; i < _inputs.size(); ++i)
					if (*_inputs[i] != *tx._inputs[i]) {
						equal = false;
						break;
					}

			if (equal)
				for (int i = 0; i < _attributes.size(); ++i)
					if (*_attributes[i] != *tx._attributes[i]) {
						equal = false;
						break;
					}

			if (equal)
				for (int i = 0; i < _programs.size(); ++i)
					if (*_programs[i] != *tx._programs[i]) {
						equal = false;
						break;
					}

			return equal;
		}
*/
	public IsRegistered(): boolean {
		return this._isRegistered;
	}

	public ResetHash() {
		this._txHash = new BigNumber(0);
	}

	public GetHash(): uint256 {
		if (this._txHash.eq(0)) {
			let stream: ByteStream;
			this.SerializeUnsigned(stream);
			this._txHash = sha256_2(stream.getBytes());
		}
		return this._txHash;
	}

	public SetHash(hash: uint256) {
		this._txHash = hash;
	}

	public GetVersion(): uint8_t {
		return this._version;
	}

	public SetVersion(version: uint8_t) {
		this._version = version;
	}

	public GetTransactionType(): uint8_t {
		return this._type;
	}

	public SetTransactionType(type: uint8_t) {
		this._type = type;
	}

	/*std::vector<uint8_t> Transaction::GetDPoSTxTypes() {
		return {registerProducer, cancelProducer, updateProducer, returnDepositCoin, activateProducer};
	}

	std::vector<uint8_t> Transaction::GetCRCTxTypes() {
		return {registerCR, unregisterCR, updateCR, returnCRDepositCoin, crCouncilMemberClaimNode};
	}

	std::vector<uint8_t> Transaction::GetProposalTypes() {
		return {crcProposal, crcProposalReview, crcProposalTracking, crcAppropriation, crcProposalWithdraw};
	}
*/
	private Reinit() {
		this.Cleanup();
		this._type = DEFAULT_PAYLOAD_TYPE;
		this._payload = this.InitPayload(this._type);

		this._version = TxVersion.Default;
		this._lockTime = TX_LOCKTIME;
		this._blockHeight = TX_UNCONFIRMED;
		this._payloadVersion = 0;
		this._fee = 0;
	}

	public GetOutputs(): TransactionOutput[] {
		return this._outputs;
	}

	public SetOutputs(outputs: OutputArray) {
		this._outputs = outputs;
	}

	public AddOutput(output: TransactionOutput) {
		this._outputs.push(output);
	}

	/*	void Transaction::RemoveOutput(const OutputPtr &output) {
			for (std::vector<OutputPtr>::iterator it = _outputs.begin(); it != _outputs.end(); ) {
				if (output == (*it)) {
					it = _outputs.erase(it);
					break;
				} else {
					++it;
				}
			}
		}

		const std::vector<InputPtr> &Transaction::GetInputs() const {
			return _inputs;
		}

		std::vector<InputPtr>& Transaction::GetInputs() {
			return _inputs;
		}*/

	public AddInput(Input: TransactionInput) {
		this._inputs.push(Input);
	}

	/*	bool Transaction::ContainInput(const uint256 &hash, uint32_t n) const {
			for (size_t i = 0; i < _inputs.size(); ++i) {
				if (_inputs[i]->TxHash() == hash && n == _inputs[i]->Index()) {
					return true;
				}
			}

			return false;
		}

		uint32_t Transaction::GetLockTime() const {

			return _lockTime;
		}

		void Transaction::SetLockTime(uint32_t t) {

			_lockTime = t;
		}

		uint32_t Transaction::GetBlockHeight() const {
			return _blockHeight;
		}

		void Transaction::SetBlockHeight(uint32_t height) {
			_blockHeight = height;
		}

		time_t Transaction::GetTimestamp() const {
			return _timestamp;
		}

		void Transaction::SetTimestamp(time_t t) {
			_timestamp = t;
		}*/

	public EstimateSize(): size_t {
		let i: size_t, txSize = 0;
		let stream = new ByteStream();

		if (this._version >= TxVersion.V09)
			txSize += 1;

		// type, payloadversion
		txSize += 2;

		// payload
		txSize += this._payload.estimateSize(this._payloadVersion);

		txSize += stream.writeVarUInt(this._attributes.length);
		for (i = 0; i < this._attributes.length; ++i)
			txSize += this._attributes[i].estimateSize();

		txSize += stream.writeVarUInt(this._inputs.length);
		for (i = 0; i < this._inputs.length; ++i)
			txSize += this._inputs[i].estimateSize();

		txSize += stream.writeVarUInt(this._outputs.length);
		for (i = 0; i < this._outputs.length; ++i)
			txSize += this._outputs[i].estimateSize();

		txSize += 4; // WAS sizeof(this._lockTime);

		txSize += stream.writeVarUInt(this._programs.length);
		for (i = 0; i < this._programs.length; ++i)
			txSize += this._programs[i].estimateSize();

		return txSize;
	}

	public getSignedInfo(): JSONArray {
		let info = [];
		let md: uint256 = this.GetShaData();

		for (let i = 0; i < this._programs.length; ++i) {
			info.push(this._programs[i].getSignedInfo(md));
		}
		return info;
	}

	isSigned(): boolean {
		if (this._type == TransactionType.rechargeToSideChain || this._type == TransactionType.coinBase)
			return true;

		if (this._programs.length == 0)
			return false;

		let md: uint256 = this.GetShaData();

		for (let i = 0; i < this._programs.length; ++i) {
			if (!this._programs[i].verifySignature(md))
				return false;
		}

		return true;
	}

	public IsCoinBase(): boolean {
		return this._type == TransactionType.coinBase;
	}

	public IsUnconfirmed(): boolean {
		return this._blockHeight == TX_UNCONFIRMED;
	}

	public IsValid(): boolean {
		if (!this.isSigned()) {
			Log.error("verify tx signature fail");
			return false;
		}

		for (let i = 0; i < this._attributes.length; ++i) {
			if (!this._attributes[i].isValid()) {
				Log.error("tx attribute is invalid");
				return false;
			}
		}

		if (this._payload === null || !this._payload.isValid(this._payloadVersion)) {
			Log.error("tx payload invalid");
			return false;
		}

		if (this._outputs.length == 0) {
			Log.error("tx without output");
			return false;
		}

		for (let i = 0; i < this._outputs.length; ++i) {
			if (!this._outputs[i].IsValid()) {
				Log.error("tx output is invalid");
				return false;
			}
		}

		return true;
	}

	/*const IPayload *Transaction::GetPayload() const {
		return _payload.get();
	}

	IPayload *Transaction::GetPayload() {
		return _payload.get();
	}

	const PayloadPtr &Transaction::GetPayloadPtr() const {
		return _payload;
	}

	void Transaction::SetPayload(const PayloadPtr &payload) {
		_payload = payload;
	}*/

	public addAttribute(attribute: Attribute) {
		this._attributes.push(attribute);
	}

	public getAttributes(): Attribute[] {
		return this._attributes;
	}

	public addUniqueProgram(program: Program): boolean {
		for (let i = 0; i < this._programs.length; ++i) {
			if (this._programs[i].getCode().equals(program.getCode())) {
				return false;
			}
		}

		this._programs.push(program);

		return true;
	}

	public addProgram(program: Program) {
		this._programs.push(program);
	}

	public getPrograms(): Program[] {
		return this._programs;
	}

	public clearPrograms() {
		this._programs = [];
	}

	public serialize(ostream: ByteStream) {
		this.serializeUnsigned(ostream);

		ostream.writeVarUInt(this._programs.length);
		for (let i = 0; i < this._programs.length; i++) {
			this._programs[i].serialize(ostream);
		}
	}

	public serializeUnsigned(ostream: ByteStream) {
		if (this._version >= TxVersion.V09) {
			ostream.writeByte(this._version);
		}
		ostream.writeByte(this._type);

		ostream.writeByte(this._payloadVersion);

		ErrorChecker.CheckCondition(this._payload == null, Error.Code.Transaction, "payload should not be null");

		this._payload.serialize(ostream, this._payloadVersion);

		ostream.writeVarUInt(this._attributes.length);
		this._attributes.forEach(a => a.serialize(ostream));

		ostream.writeVarUInt(this._inputs.length);
		this._inputs.forEach(i => i.serialize(ostream));

		ostream.writeVarUInt(this._outputs.length);
		this._outputs.forEach(o => o.serialize(ostream, this._version));

		ostream.writeUInt32(this._lockTime);
	}

	/*bool Transaction::DeserializeType(const ByteStream &istream) {
		uint8_t flagByte = 0;
		if (!istream.ReadByte(flagByte)) {
			Log::error("deserialize flag byte error");
			return false;
		}

		if (flagByte >= TxVersion::V09) {
			_version = static_cast<TxVersion>(flagByte);
			if (!istream.ReadByte(_type)) {
				Log::error("deserialize type error");
				return false;
			}
		} else {
			_version = TxVersion::Default;
			_type = flagByte;
		}
		return true;
	}

	bool Transaction::Deserialize(const ByteStream &istream) {
		Reinit();

		if (!DeserializeType(istream)) {
			return false;
		}

		if (!istream.ReadByte(_payloadVersion))
			return false;

		_payload = InitPayload(_type);

		if (_payload == nullptr) {
			Log::error("new _payload with _type={} when deserialize error", _type);
			return false;
		}
		if (!_payload->Deserialize(istream, _payloadVersion))
			return false;

		uint64_t attributeLength = 0;
		if (!istream.ReadVarUint(attributeLength))
			return false;

		for (size_t i = 0; i < attributeLength; i++) {
			AttributePtr attribute(new Attribute());
			if (!attribute->Deserialize(istream)) {
				Log::error("deserialize tx attribute[{}] error", i);
				return false;
			}
			_attributes.push_back(attribute);
		}

		uint64_t inCount = 0;
		if (!istream.ReadVarUint(inCount)) {
			Log::error("deserialize tx inCount error");
			return false;
		}

		_inputs.reserve(inCount);
		for (size_t i = 0; i < inCount; i++) {
			InputPtr input(new TransactionInput());
			if (!input->Deserialize(istream)) {
				Log::error("deserialize tx input [{}] error", i);
				return false;
			}
			_inputs.push_back(input);
		}

		uint64_t outputLength = 0;
		if (!istream.ReadVarUint(outputLength)) {
			Log::error("deserialize tx output len error");
			return false;
		}

		if (outputLength > UINT16_MAX) {
			Log::error("deserialize tx: too much outputs: {}", outputLength);
			return false;
		}

		_outputs.reserve(outputLength);
		for (size_t i = 0; i < outputLength; i++) {
			OutputPtr output(new TransactionOutput());
			if (!output->Deserialize(istream, _version)) {
				Log::error("deserialize tx output[{}] error", i);
				return false;
			}

			_outputs.push_back(output);
		}

		if (!istream.ReadUint32(_lockTime)) {
			Log::error("deserialize tx lock time error");
			return false;
		}

		uint64_t programLength = 0;
		if (!istream.ReadVarUint(programLength)) {
			Log::error("deserialize tx program length error");
			return false;
		}

		for (size_t i = 0; i < programLength; i++) {
			ProgramPtr program(new Program());
			if (!program->Deserialize(istream)) {
				Log::error("deserialize program[{}] error", i);
				return false;
			}
			_programs.push_back(program);
		}

#if 0
		ByteStream stream;
		SerializeUnsigned(stream);
		_txHash = sha256_2(stream.GetBytes());
#endif

		return true;
	}*/

	public ToJson(): json {
		return {
			IsRegistered: this._isRegistered,
			TxHash: this.GetHash().toString(16),
			Version: this._version,
			LockTime: this._lockTime,
			BlockHeight: this._blockHeight,
			Timestamp: this._timestamp,
			Inputs: this._inputs,
			Type: this._type,
			PayloadVersion: this._payloadVersion,
			PayLoad: this._payload.toJson(this._payloadVersion),
			Attributes: this._attributes,
			Programs: this._programs,
			Outputs: this._outputs,
			Fee: this._fee
		};
	}

	public FromJson(j: json) {
		this.Reinit();

		try {
			this._isRegistered = j["IsRegistered"] as boolean;

			this._version = j["Version"] as TxVersion;
			this._lockTime = j["LockTime"] as uint32_t;
			this._blockHeight = j["BlockHeight"] as uint32_t;
			this._timestamp = j["Timestamp"] as uint32_t
			this._inputs = j["Inputs"].get<InputArray>();
			this._type = j["Type"] as uint8_t;
			this._payloadVersion = j["PayloadVersion"] as number;
			this._payload = this.InitPayload(this._type);

			if (this._payload === null) {
				Log.error("_payload is nullptr when convert from json");
			} else {
				this._payload.fromJson(j["PayLoad"] as json, this._payloadVersion);
			}

			this._attributes = j["Attributes"].get<AttributeArray>();
			this._programs = j["Programs"].get<ProgramArray>();
			this._outputs = j["Outputs"].get<OutputArray>();
			this._fee = j["Fee"] as uint64_t;

			this._txHash = new BigNumber(j["TxHash"] as string, 16);
		} catch (e) {
			ErrorChecker.ThrowLogicException(Error.Code.JsonFormatError, "tx from json: " + e);
		}
	}

	public CalculateFee(feePerKb: uint64_t): uint64_t {
		return ((this.EstimateSize() + 999) / 1000) * feePerKb;
	}

	GetShaData(): uint256 {
		let stream = new ByteStream();
		this.SerializeUnsigned(stream);
		return new BigNumber(SHA256.encodeToString(stream.getBytes())); // WAS uint256(sha256(stream.GetBytes()));
	}

	public InitPayload(type: uint8_t): Payload {
		let payload: Payload = null;

		if (type == TransactionType.coinBase) {
			payload = new CoinBase();
		} /* TODO else if (type == registerAsset) {
			payload = PayloadPtr(new RegisterAsset());
		} else if (type == transferAsset) {
			payload = PayloadPtr(new TransferAsset());
		} else if (type == record) {
			payload = PayloadPtr(new Record());
		} else if (type == deploy) {
			//todo add deploy _payload
			//_payload = boost::shared_ptr<PayloadDeploy>(new PayloadDeploy());
		} else if (type == sideChainPow) {
			payload = PayloadPtr(new SideChainPow());
		} else if (type == rechargeToSideChain) { // side chain payload
			payload = PayloadPtr(new RechargeToSideChain());
		} else if (type == withdrawFromSideChain) {
			payload = PayloadPtr(new WithdrawFromSideChain());
		} else if (type == transferCrossChainAsset) {
			payload = PayloadPtr(new TransferCrossChainAsset());
		} else if (type == registerProducer || type == updateProducer) {
			payload = PayloadPtr(new ProducerInfo());
		} else if (type == cancelProducer) {
			payload = PayloadPtr(new CancelProducer());
		} else if (type == returnDepositCoin) {
			payload = PayloadPtr(new ReturnDepositCoin());
		} else if (type == nextTurnDPOSInfo) {
			payload = PayloadPtr(new NextTurnDPoSInfo());
		} else if (type == registerCR || type == updateCR) {
			payload = PayloadPtr(new CRInfo());
		} else if (type == unregisterCR) {
			payload = PayloadPtr(new UnregisterCR());
		} else if (type == returnCRDepositCoin) {
			payload = PayloadPtr(new ReturnDepositCoin());
		} else if (type == crcProposal) {
			payload = PayloadPtr(new CRCProposal());
		} else if (type == crcProposalReview) {
			payload = PayloadPtr(new CRCProposalReview());
		} else if (type == crcProposalTracking) {
			payload = PayloadPtr(new CRCProposalTracking());
		} else if (type == crcProposalWithdraw) {
			payload = PayloadPtr(new CRCProposalWithdraw());
		} else if (type == crcProposalRealWithdraw) {
			payload = PayloadPtr(new CRCProposalRealWithdraw());
		} else if (type == crcAssetsRectify) {
			payload = PayloadPtr(new CRCAssetsRectify());
		} else if (type == crCouncilMemberClaimNode) {
			payload = PayloadPtr(new CRCouncilMemberClaimNode());
		} */

		return payload;
	}

	private Cleanup() {
		this._inputs = [];
		this._outputs = [];
		this._attributes = [];
		this._programs = [];
		// TODO - WHERE IS THIS Payload.reset() IN C++? this._payload.reset();
	}

	public GetPayloadVersion(): uint8_t {
		return this._payloadVersion;
	}

	public SetPayloadVersion(version: uint8_t) {
		this._payloadVersion = version;
	}

	public GetFee(): uint64_t {
		return this._fee;
	}

	public SetFee(f: uint64_t) {
		this._fee = f;
	}

	public IsEqual(tx: Transaction): boolean {
		return this.GetHash() == tx.GetHash();
	}

	public GetConfirms(walletBlockHeight: uint32_t): uint32_t {
		if (this._blockHeight == TX_UNCONFIRMED)
			return 0;

		return walletBlockHeight >= this._blockHeight ? walletBlockHeight - this._blockHeight + 1 : 0;
	}

	GetConfirmStatus(walletBlockHeight: uint32_t): string {
		let confirm = this.GetConfirms(walletBlockHeight);

		let status: string;
		if (this.IsCoinBase()) {
			status = confirm <= 100 ? "Pending" : "Confirmed";
		} else {
			status = confirm < 2 ? "Pending" : "Confirmed";
		}

		return status;
	}
}


