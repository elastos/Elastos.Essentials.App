// Copyright (c) 2012-2018 The Elastos Open Source Project
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { ByteStream, time_t, uint256, uint32_t, uint64_t, uint8_t } from "../types";
import { Attribute } from "./Attribute";
import { Payload } from "./payload/Payload";
import { Program } from "./Program";
import { TransactionInput } from "./TransactionInput";
import { TransactionOutput } from "./TransactionOutput";

/* export enum {
	coinBase                 = 0x00,
	registerAsset            = 0x01,
	transferAsset            = 0x02,
	record                   = 0x03,
	deploy                   = 0x04,
	sideChainPow             = 0x05,
	rechargeToSideChain      = 0x06,
	withdrawFromSideChain    = 0x07,
	transferCrossChainAsset  = 0x08,

	registerProducer         = 0x09,
	cancelProducer           = 0x0a,
	updateProducer           = 0x0b,
	returnDepositCoin        = 0x0c,
	activateProducer         = 0x0d,

	IllegalProposalEvidence  = 0x0e,
	IllegalVoteEvidence      = 0x0f,
	IllegalBlockEvidence     = 0x10,
	IllegalSidechainEvidence = 0x11,
	InactiveArbitrators      = 0x12,
	UpdateVersion            = 0x13,
	nextTurnDPOSInfo         = 0x14,

	registerCR               = 0x21,
	unregisterCR             = 0x22,
	updateCR                 = 0x23,
	returnCRDepositCoin      = 0x24,

	crcProposal              = 0x25,
	crcProposalReview        = 0x26,
	crcProposalTracking      = 0x27,
	crcAppropriation         = 0x28,
	crcProposalWithdraw      = 0x29,
	crcProposalRealWithdraw  = 0x2a,
	crcAssetsRectify         = 0x2b,
	crCouncilMemberClaimNode = 0x31,

	TypeMaxCount
}; */

export enum TxVersion {
	Default = 0x00,
	V09 = 0x09,
}

// TODO: remove all those Ptr
//type WalletPtr = Wallet;
type OutputPtr = TransactionOutput;
type OutputArray = OutputPtr[];
type InputPtr = TransactionInput;
type InputArray = InputPtr[];
type ProgramPtr = Program;
type ProgramArray = ProgramPtr[];
type AttributePtr = Attribute;
type AttributeArray = AttributePtr[];

/* #define DEFAULT_PAYLOAD_TYPE  transferAsset
#define TX_LOCKTIME          0x00000000
#define TX_UNCONFIRMED       INT32_MAX   // block height indicating transaction is unconfirmed
 */
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
	}

	Transaction::Transaction(uint8_t type, PayloadPtr payload) :
		_version(TxVersion::Default),
		_lockTime(TX_LOCKTIME),
		_blockHeight(TX_UNCONFIRMED),
		_payloadVersion(0),
		_fee(0),
		_type(type),
		_isRegistered(false),
		_txHash(0),
		_timestamp(0),
		_payload(std::move(payload)) {
	}

	Transaction::Transaction(const Transaction &tx) {
		this->operator=(tx);
	} */

	/* Transaction &Transaction::operator=(const Transaction &orig) {
		_isRegistered = orig._isRegistered;
		_txHash = orig.GetHash();

		_version = orig._version;
		_lockTime = orig._lockTime;
		_blockHeight = orig._blockHeight;
		_timestamp = orig._timestamp;

		_type = orig._type;
		_payloadVersion = orig._payloadVersion;
		_fee = orig._fee;

		_payload = InitPayload(orig._type);

		*_payload = *orig._payload;

		_inputs.clear();
		for (size_t i = 0; i < orig._inputs.size(); ++i) {
			_inputs.push_back(InputPtr(new TransactionInput(*orig._inputs[i])));
		}

		_outputs.clear();
		for (size_t i = 0; i < orig._outputs.size(); ++i) {
			_outputs.push_back(OutputPtr(new TransactionOutput(*orig._outputs[i])));
		}

		_attributes.clear();
		for (size_t i = 0; i < orig._attributes.size(); ++i) {
			_attributes.push_back(AttributePtr(new Attribute(*orig._attributes[i])));
		}

		_programs.clear();
		for (size_t i = 0; i < orig._programs.size(); ++i) {
			_programs.push_back(ProgramPtr(new Program(*orig._programs[i])));
		}

		return *this;
	}

	bool Transaction::operator==(const Transaction &tx) const {
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

	Transaction::~Transaction() {
	}

	bool Transaction::IsRegistered() const {
		return _isRegistered;
	}

	bool &Transaction::IsRegistered() {
		return _isRegistered;
	}

	void Transaction::ResetHash() {
		_txHash = 0;
	}*/

	GetHash(): uint256 {
		if (this._txHash == 0) {
			let stream: ByteStream;
			this.SerializeUnsigned(stream);
			this._txHash = sha256_2(stream.GetBytes());
		}
		return this._txHash;
	}

	/*void Transaction::SetHash(const uint256 &hash) {
		_txHash = hash;
	}

	uint8_t Transaction::GetVersion() const {
		return _version;
	}

	void Transaction::SetVersion(uint8_t version) {
		_version = version;
	}

	uint8_t Transaction::GetTransactionType() const {
		return _type;
	}

	void Transaction::SetTransactionType(uint8_t type) {
		_type = type;
	}

	std::vector<uint8_t> Transaction::GetDPoSTxTypes() {
		return {registerProducer, cancelProducer, updateProducer, returnDepositCoin, activateProducer};
	}

	std::vector<uint8_t> Transaction::GetCRCTxTypes() {
		return {registerCR, unregisterCR, updateCR, returnCRDepositCoin, crCouncilMemberClaimNode};
	}

	std::vector<uint8_t> Transaction::GetProposalTypes() {
		return {crcProposal, crcProposalReview, crcProposalTracking, crcAppropriation, crcProposalWithdraw};
	}

	private void Transaction::Reinit() {
		Cleanup();
		_type = DEFAULT_PAYLOAD_TYPE;
		_payload = InitPayload(_type);

		_version = TxVersion::Default;
		_lockTime = TX_LOCKTIME;
		_blockHeight = TX_UNCONFIRMED;
		_payloadVersion = 0;
		_fee = 0;
	}

	const std::vector<OutputPtr> &Transaction::GetOutputs() const {
		return _outputs;
	}*/

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

	public AddInput(Input: InputPtr) {
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
		}

		size_t Transaction::EstimateSize() const {
			size_t i, txSize = 0;
			ByteStream stream;

			if (_version >= TxVersion::V09)
				txSize += 1;

			// type, payloadversion
			txSize += 2;

			// payload
			txSize += _payload->EstimateSize(_payloadVersion);

			txSize += stream.WriteVarUint(_attributes.size());
			for (i = 0; i < _attributes.size(); ++i)
				txSize += _attributes[i]->EstimateSize();

			txSize += stream.WriteVarUint(_inputs.size());
			for (i = 0; i < _inputs.size(); ++i)
				txSize += _inputs[i]->EstimateSize();

			txSize += stream.WriteVarUint(_outputs.size());
			for (i = 0; i < _outputs.size(); ++i)
				txSize += _outputs[i]->EstimateSize();

			txSize += sizeof(_lockTime);

			txSize += stream.WriteVarUint(_programs.size());
			for (i = 0; i < _programs.size(); ++i)
				txSize += _programs[i]->EstimateSize();

			return txSize;
		}

		nlohmann::json Transaction::GetSignedInfo() const {
			nlohmann::json info;
			uint256 md = GetShaData();

			for (size_t i = 0; i < _programs.size(); ++i) {
				info.push_back(_programs[i]->GetSignedInfo(md));
			}
			return info;
		}

		bool Transaction::IsSigned() const {
			if (_type == rechargeToSideChain || _type == coinBase)
				return true;

			if (_programs.size() == 0)
				return false;

			uint256 md = GetShaData();

			for (size_t i = 0; i < _programs.size(); ++i) {
				if (!_programs[i]->VerifySignature(md))
					return false;
			}

			return true;
		}

		bool Transaction::IsCoinBase() const {
			return _type == coinBase;
		}

		bool Transaction::IsUnconfirmed() const {
			return _blockHeight == TX_UNCONFIRMED;
		}

		bool Transaction::IsValid() const {
			if (!IsSigned()) {
				Log::error("verify tx signature fail");
				return false;
			}

			for (size_t i = 0; i < _attributes.size(); ++i) {
				if (!_attributes[i]->IsValid()) {
					Log::error("tx attribute is invalid");
					return false;
				}
			}

			if (_payload == nullptr || !_payload->IsValid(_payloadVersion)) {
				Log::error("tx payload invalid");
				return false;
			}

			if (_outputs.size() == 0) {
				Log::error("tx without output");
				return false;
			}

			for (size_t i = 0; i < _outputs.size(); ++i) {
				if (!_outputs[i]->IsValid()) {
					Log::error("tx output is invalid");
					return false;
				}
			}

			return true;
		}

		const IPayload *Transaction::GetPayload() const {
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

	addAttribute(attribute: Attribute) {
		this._attributes.push(attribute);
	}

	/*const std::vector<AttributePtr> &Transaction::GetAttributes() const {
		return _attributes;
	}*/

	public AddUniqueProgram(program: ProgramPtr): boolean {
		for (let i = 0; i < this._programs.length; ++i) {
			if (this._programs[i].GetCode().equals(program.GetCode())) {
				return false;
			}
		}

		this._programs.push(program);

		return true;
	}

	/*void Transaction::AddProgram(const ProgramPtr &program) {
		_programs.push_back(program);
	}

	const std::vector<ProgramPtr> &Transaction::GetPrograms() const {
		return _programs;
	}

	void Transaction::ClearPrograms() {
		_programs.clear();
	}*/

	public Serialize(ostream: ByteStream) {
		this.SerializeUnsigned(ostream);

		ostream.WriteVarUint(_programs.size());
		for (let i = 0; i < this._programs.length; i++) {
			this._programs[i].Serialize(ostream);
		}
	}

	/*void Transaction::SerializeUnsigned(ByteStream &ostream) const {
		if (_version >= TxVersion::V09) {
			ostream.WriteByte(_version);
		}
		ostream.WriteByte(_type);

		ostream.WriteByte(_payloadVersion);

		ErrorChecker::CheckCondition(_payload == nullptr, Error::Transaction,
									 "payload should not be null");

		_payload->Serialize(ostream, _payloadVersion);

		ostream.WriteVarUint(_attributes.size());
		for (size_t i = 0; i < _attributes.size(); i++) {
			_attributes[i]->Serialize(ostream);
		}

		ostream.WriteVarUint(_inputs.size());
		for (size_t i = 0; i < _inputs.size(); i++) {
			_inputs[i]->Serialize(ostream);
		}

		ostream.WriteVarUint(_outputs.size());
		for (size_t i = 0; i < _outputs.size(); i++) {
			_outputs[i]->Serialize(ostream, _version);
		}

		ostream.WriteUint32(_lockTime);
	}

	bool Transaction::DeserializeType(const ByteStream &istream) {
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
	}

	nlohmann::json Transaction::ToJson() const {
		nlohmann::json j;

		j["IsRegistered"] = _isRegistered;

		j["TxHash"] = GetHash().GetHex();
		j["Version"] = _version;
		j["LockTime"] = _lockTime;
		j["BlockHeight"] = _blockHeight;
		j["Timestamp"] = _timestamp;
		j["Inputs"] = _inputs;
		j["Type"] = _type;
		j["PayloadVersion"] = _payloadVersion;
		j["PayLoad"] = _payload->ToJson(_payloadVersion);
		j["Attributes"] = _attributes;
		j["Programs"] = _programs;
		j["Outputs"] = _outputs;
		j["Fee"] = _fee;

		return j;
	}

	void Transaction::FromJson(const nlohmann::json &j) {
		Reinit();

		try {
			_isRegistered = j["IsRegistered"];

			uint8_t version = j["Version"].get<uint8_t>();
			_version = static_cast<TxVersion>(version);
			_lockTime = j["LockTime"].get<uint32_t>();
			_blockHeight = j["BlockHeight"].get<uint32_t>();
			_timestamp = j["Timestamp"].get<uint32_t>();
			_inputs = j["Inputs"].get<InputArray>();
			_type = j["Type"].get<uint8_t>();
			_payloadVersion = j["PayloadVersion"];
			_payload = InitPayload(_type);

			if (_payload == nullptr) {
				Log::error("_payload is nullptr when convert from json");
			} else {
				_payload->FromJson(j["PayLoad"], _payloadVersion);
			}

			_attributes = j["Attributes"].get<AttributeArray>();
			_programs = j["Programs"].get<ProgramArray>();
			_outputs = j["Outputs"].get<OutputArray>();
			_fee = j["Fee"].get<uint64_t>();

			_txHash.SetHex(j["TxHash"].get<std::string>());
		} catch (const nlohmann::detail::exception &e) {
			ErrorChecker::ThrowLogicException(Error::Code::JsonFormatError, "tx from json: " +
																			std::string(e.what()));
		}
	}

	uint64_t Transaction::CalculateFee(uint64_t feePerKb) {
		return ((EstimateSize() + 999) / 1000) * feePerKb;
	}

	uint256 Transaction::GetShaData() const {
		ByteStream stream;
		SerializeUnsigned(stream);
		return uint256(sha256(stream.GetBytes()));
	}

	PayloadPtr Transaction::InitPayload(uint8_t type) {
		PayloadPtr payload = nullptr;

		if (type == coinBase) {
			payload = PayloadPtr(new CoinBase());
		} else if (type == registerAsset) {
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
		}

		return payload;
	}

	void Transaction::Cleanup() {
		_inputs.clear();
		_outputs.clear();
		_attributes.clear();
		_programs.clear();
		_payload.reset();
	}

	uint8_t Transaction::GetPayloadVersion() const {
		return _payloadVersion;
	}

	void Transaction::SetPayloadVersion(uint8_t version) {
		_payloadVersion = version;
	}

	uint64_t Transaction::GetFee() const {
		return _fee;
	}

	void Transaction::SetFee(uint64_t f) {
		_fee = f;
	}

	bool Transaction::IsEqual(const Transaction &tx) const {
		return GetHash() == tx.GetHash();
	}

	uint32_t Transaction::GetConfirms(uint32_t walletBlockHeight) const {
		if (_blockHeight == TX_UNCONFIRMED)
			return 0;

		return walletBlockHeight >= _blockHeight ? walletBlockHeight - _blockHeight + 1 : 0;
	}

	std::string Transaction::GetConfirmStatus(uint32_t walletBlockHeight) const {
		uint32_t confirm = GetConfirms(walletBlockHeight);

		std::string status;
		if (IsCoinBase()) {
			status = confirm <= 100 ? "Pending" : "Confirmed";
		} else {
			status = confirm < 2 ? "Pending" : "Confirmed";
		}

		return status;
	} */

}


