
import React, { useState, useEffect } from 'react'
import { Button, Modal } from 'antd'
import './index.less'

export default function MultiModal() {
  return (
    <>
      <ModalA />
      <ModalB />
    </>
  )
}


const ModalA = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);

  console.log('ModalA');

  useEffect(() => {
    console.log('ModalA useEffect');
  }, []);

  const showModal = () => {
    setIsModalVisible(true);
  };

  const handleOk = () => {
    setIsModalVisible(false);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
  };

  return (
    <>
      <Button type="primary" onClick={showModal}>
        Open Modal A
      </Button>
      <Modal title="Basic Modal" visible={isModalVisible} onOk={handleOk} onCancel={handleCancel}>
        <p>AAAAAAA</p>
      </Modal>
    </>
  );
};

const ModalB = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  console.log('ModalB');

  useEffect(() => {
    console.log('ModalB useEffect');
  }, []);

  const showModal = () => {
    setIsModalVisible(true);
  };

  const handleOk = () => {
    setIsModalVisible(false);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
  };

  return (
    <>

      <Modal title="Basic Modal" visible={isModalVisible} onOk={handleOk} onCancel={handleCancel}>
        <p>BBBBBBBB.</p>
      </Modal>
    </>
  );
};